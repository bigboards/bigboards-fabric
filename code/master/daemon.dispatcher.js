var kv = require('../store/kv'),
    events = require('../store/events'),
    settings = require('../settings'),
    tu = require('../utils/tint-utils'),
    Q = require('q'),
    log4js = require('log4js');

var logger = log4js.getLogger('dispatcher.daemon');
var containerModelMapper = require('../model/container/v2.0');

var cluster = require('../cluster');

/**
 * The container dispatcher will take a tint and a container definition and generate the container definition and
 * resource definition needed for a node to deploy a container and the resources it requires.
 */
module.exports = {
    start: startTintDaemons,
    install: {
        byTint: installTintDaemons
    },
    remove: {
        all: removeAllDaemons,
        byTint: removeTintDaemons
    }
};

// ====================================================================================================================
// == Start & Stop
// ====================================================================================================================
function startTintDaemons(tint) {
    var promises = [];
    tint.services.forEach(function(service) {
        service.daemons.forEach(function(daemon) {
            promises.push(startDaemon(tint, service, daemon));
        });
    });

    return promises;
}

function startDaemon(tint, service, daemon) {
    var tintId = tu.id(tint);

    logger.info('Starting daemon ' + service.id + '.' + daemon.id + ' for tint ' + tintId);

    return cluster.nodes.byExpression(daemon.instances)
        .then(function(nodes) {
            var promises = [];

            nodes.forEach(function(node) {
                promises.push(node.daemons.startDaemon(tintId, service.id, daemon.id));
            });

            return Q.all(promises);
        });
}

// ====================================================================================================================
// == Install
// ====================================================================================================================
function installTintDaemons(tint) {
    var promises = [];

    tint.services.forEach(function(service) {
        service.daemons.forEach(function(daemon) {
            promises.push(installDaemon(tint, service, daemon));
        })
    });

    return Q.all(promises)
}

function installDaemon(tint, service, daemon) {
    logger.info('Installing daemon ' + service.id + '.' + daemon.id + ' for tint ' + tu.id(tint));
    var tintId = tu.id(tint);

    // -- convert daemon volumes pointing to resources to use absolute paths instead of resource names
    var volumes = daemon.configuration.Mounts;
    if (volumes) {
        volumes.forEach(function (volume) {
            var tintFsDir = settings.get('data_dir') + '/tints/' + tintId + '/resources';

            var filename;
            if (volume.Source.indexOf('resource:') == 0) {
                // -- mount a configuration volume. This means we will take the data from consul and generate it into the
                // -- configuration folder on the FS
                filename = volume.Source.substr('resource:'.length);
                if (filename.indexOf('/') == 0) filename = filename.substring(1);

                volume.Source = tintFsDir + '/' + filename;
            }
        });
    }

    return cluster.nodes.byExpression(daemon.instances)
        .then(function(nodes) {
            var promises = [];

            nodes.forEach(function(node) {
                promises.push(node.daemons.create(
                    tintId,
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

function removeTintDaemons(tint) {
    logger.info('Flagging tint daemons for removal ' + tu.id(tint));

    return cluster.nodes.all().then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            promises.push(node.daemons.removeForTint(tu.id(tint)));
        });

        return Q.all(promises);
    });
}