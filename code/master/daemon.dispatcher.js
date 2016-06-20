var kv = require('../store/kv'),
    events = require('../store/events'),
    settings = require('../settings'),
    tu = require('../utils/app-utils'),
    Q = require('q'),
    log4js = require('log4js');

var logger = log4js.getLogger('dispatcher.daemon');
var containerModelMapper = require('../model/container/v2.0');

var cluster = require('../cluster');

/**
 * The container dispatcher will take an app and a container definition and generate the container definition and
 * resource definition needed for a node to deploy a container and the resources it requires.
 */
module.exports = {
    start: startAppDaemons,
    stop: stopAppDaemons,
    install: {
        byApp: installAppDaemons
    },
    remove: {
        all: removeAllDaemons,
        byApp: removeAppDaemons
    }
};

// ====================================================================================================================
// == Start & Stop
// ====================================================================================================================
function startAppDaemons(app) {
    var promises = [];
    app.services.forEach(function(service) {
        service.daemons.forEach(function(daemon) {
            promises.push(startDaemon(app, service, daemon));
        });
    });

    return Q.all(promises);
}

function startDaemon(app, service, daemon) {
    var appId = tu.id(app);

    logger.info('Starting daemon ' + service.id + '.' + daemon.id + ' for app ' + appId);

    return cluster.nodes.byExpression(daemon.instances)
        .then(function(nodes) {
            var promises = [];

            nodes.forEach(function(node) {
                promises.push(node.daemons.startDaemon(appId, service.id, daemon.id));
            });

            return Q.all(promises);
        });
}

function stopAppDaemons(app) {
    var promises = [];
    app.services.forEach(function(service) {
        service.daemons.forEach(function(daemon) {
            promises.push(stopDaemon(app, service, daemon));
        });
    });

    return Q.all(promises);
}

function stopDaemon(app, service, daemon) {
    var appId = tu.id(app);

    logger.info('Stopping daemon ' + service.id + '.' + daemon.id + ' for app ' + appId);

    return cluster.nodes.byExpression(daemon.instances)
        .then(function(nodes) {
            var promises = [];

            nodes.forEach(function(node) {
                promises.push(node.daemons.stopDaemon(appId, service.id, daemon.id));
            });

            return Q.all(promises);
        });
}

// ====================================================================================================================
// == Install
// ====================================================================================================================
function installAppDaemons(app) {
    var promises = [];

    app.services.forEach(function(service) {
        service.daemons.forEach(function(daemon) {
            promises.push(installDaemon(app, service, daemon));
        })
    });

    return Q.all(promises)
}

function installDaemon(app, service, daemon) {
    logger.info('Installing daemon ' + service.id + '.' + daemon.id + ' for app ' + tu.id(app));
    var appId = tu.id(app);

    // -- convert daemon volumes pointing to resources to use absolute paths instead of resource names
    var volumes = daemon.configuration.Mounts;
    if (volumes) {
        volumes.forEach(function (volume) {
            var appFsDir = settings.get('data_dir') + '/apps/' + appId + '/resources';

            var filename;
            if (volume.Source.indexOf('resource:') == 0) {
                // -- mount a configuration volume. This means we will take the data from consul and generate it into the
                // -- configuration folder on the FS
                filename = volume.Source.substr('resource:'.length);
                if (filename.indexOf('/') == 0) filename = filename.substring(1);

                volume.Source = appFsDir + '/' + filename;
            }
        });
    }

    return cluster.nodes.byExpression(daemon.instances)
        .then(function(nodes) {
            var promises = [];

            nodes.forEach(function(node) {
                promises.push(node.daemons.create(
                    appId,
                    service.id,
                    daemon.id,
                    daemon.driver,
                    daemon.instances,
                    containerModelMapper(daemon.configuration)
                ));
            });

            return Q.all(promises);
        });
}

// ====================================================================================================================
// == Remove
// ====================================================================================================================
function removeAllDaemons() {
    return cluster.nodes.all().then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            promises.push(node.daemons.removeAll());
        });

        return Q.all(promises);
    });
}

function removeAppDaemons(app) {
    logger.info('Flagging app daemons for removal ' + tu.id(app));

    return cluster.nodes.all().then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            promises.push(node.daemons.removeForApp(tu.id(app)));
        });

        return Q.all(promises);
    });
}