var expression = require('../expression'),
    kv = require('../store/kv'),
    events = require('../store/events'),
    tu = require('../utils/app-utils'),
    Q = require('q'),
    log4js = require('log4js');

var logger = log4js.getLogger('dispatcher.resource');
var settings = require('../settings');

var cluster = require('../cluster');

module.exports = {
    install: {
        byApp: installAppResources
    },
    remove: {
        all: removeAllResources,
        byApp: removeAppResources
    }
};

// ====================================================================================================================
// == Install
// ====================================================================================================================
function installAppResources(app) {
    logger.debug('Installing resources for ' + tu.id(app));

    return cluster.nodes.all().then(function(nodes) {
        var promises = [];

        app.resources.forEach(function(resource) {
            promises.push(installResource(app, nodes, resource))
        });

        return Q.all(promises);
    });
}

function installResource(app, nodes, resource) {
    var promises = [];

    logger.debug('Dispatching resource ' + resource.id + ' for app ' + tu.id(app));

    var appId = tu.id(app);
    var appFsDir = settings.get('data_dir') + '/apps/' + appId + '/resources';
    var resourceFsDir = appFsDir + '/' + resource.id;

    nodes.forEach(function(node) {
        promises.push(node.resources.create(appId, resource.id, 'template', resourceFsDir, createScope(app)));
    });

    return Q.all(promises);
}

// ====================================================================================================================
// == Remove
// ====================================================================================================================

function removeAllResources() {
    return cluster.nodes.all().then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            promises.push(node.resources.removeAll());
        });

        return Q.all(promises);
    });
}

function removeAppResources(app) {
    return cluster.nodes.all().then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            promises.push(node.resources.removeForApp(tu.id(app)));
        });

        return Q.all(promises);
    });
}

// ====================================================================================================================
// == Helpers (todo: moved elsewhere)
// ====================================================================================================================

function createScope(app) {
    var appId = tu.id(app);

    return {
        settings: settings.get('data_dir'),
        data_dir: settings.get('data_dir') + '/apps/' + appId + '/data',
        resources_dir: settings.get('data_dir') + '/apps/' + appId + '/resources',
        config_dir: settings.get('data_dir') + '/apps/' + appId + '/resources/config'
    };
}

function getNodesForApp(app) {
    // -- run through the groups in the app to see which nodes participate in this app. Once we have all the nodes,
    // -- we can distribute the resource to them.

    var result = [];

    var promises = [];
    if (app.services) {
        app.services.forEach(function(service) {
            service.daemons.forEach(function(daemon) {
                promises.push(expression.nodes(daemon.instances).then(function(nodes) {
                    nodes.forEach(function(node) {
                        if (result.indexOf(node) == -1) result.push(node);
                    });
                }));
            })
        })
    }

    return Q.all(promises)
        .then(function() { return result; });
}