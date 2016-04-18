var expression = require('../expression'),
    kv = require('../store/kv'),
    events = require('../store/events'),
    tu = require('../utils/tint-utils'),
    Q = require('q'),
    log4js = require('log4js');

var logger = log4js.getLogger('dispatcher.resource');
var settings = require('../settings');

var cluster = require('../cluster');

module.exports = {
    install: {
        byTint: installTintResources
    },
    remove: {
        all: removeAllResources,
        byTint: removeTintResources
    }
};

// ====================================================================================================================
// == Install
// ====================================================================================================================
function installTintResources(tint) {
    logger.debug('Installing resources for ' + tu.id(tint));

    return cluster.nodes.all().then(function(nodes) {
        var promises = [];

        tint.resources.forEach(function(resource) {
            promises.push(installResource(tint, nodes, resource))
        });

        return Q.all(promises);
    });
}

function installResource(tint, nodes, resource) {
    var promises = [];

    logger.debug('Dispatching resource ' + resource.id + ' for tint ' + tu.id(tint));

    var tintId = tu.id(tint);
    var tintFsDir = settings.get('data_dir') + '/tints/' + tintId + '/resources';
    var resourceFsDir = tintFsDir + '/' + resource.id;

    nodes.forEach(function(node) {
        promises.push(node.resources.create(tintId, resource.id, 'template', resourceFsDir, createScope(tint)));
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

function removeTintResources(tint) {
    return cluster.nodes.all().then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            promises.push(node.resources.removeForTint(tu.id(tint)));
        });

        return Q.all(promises);
    });
}

// ====================================================================================================================
// == Helpers (todo: moved elsewhere)
// ====================================================================================================================

function createScope(tint) {
    var tintId = tu.id(tint);

    return {
        settings: settings.get('data_dir'),
        data_dir: settings.get('data_dir') + '/tints/' + tintId + '/data',
        resources_dir: settings.get('data_dir') + '/tints/' + tintId + '/resources',
        config_dir: settings.get('data_dir') + '/tints/' + tintId + '/resources/config'
    };
}

function getNodesForTint(tint) {
    // -- run through the groups in the tint to see which nodes participate in this tint. Once we have all the nodes,
    // -- we can distribute the resource to them.

    var result = [];

    var promises = [];
    if (tint.services) {
        tint.services.forEach(function(service) {
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