var expression = require('../expression'),
    kv = require('../store/kv'),
    tu = require('../utils/tint-utils'),
    Q = require('q'),
    log4js = require('log4js');

var logger = log4js.getLogger('dispatcher.resource');
var nodeInfo = require('../node');
var settings = require('../settings');

var events = require('../store/events'),
    eventNames = require('../event_names');

module.exports = {
    install: {
        byTint: installResourceForTint
    },
    remove: {
        all: removeResources,
        byTint: removeTintResources
    }
};

// ====================================================================================================================
// == Install
// ====================================================================================================================
function installResourceForTint(tint) {
    logger.debug('Installing resources for ' + tint.type + ' ' + tint.slug);

    return getNodesForTint(tint)
        .then(function(nodes) {
            var promises = [];

            tint.resources.forEach(function(resource) {
                promises.push(installConfigurationResource(tint, nodes, resource))
            });

            if (tint.services) {
                tint.services.forEach(function (service) {
                    service.daemons.forEach(function (daemon) {
                        promises.push(installContainerResources(tint, nodes, service, daemon));
                    })
                });
            }

            return Q.all(promises);
        });
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

function installConfigurationResource(tint, nodes, resource) {
    var promises = [];

    var tintFsDir = settings.get('data_dir') + '/tints/' + tu.id(tint) + '/resources';
    var tintConfigDir = tintFsDir + '/' + resource.id;

    nodes.forEach(function(node) {
        promises.push(
            registerResourceOnNode(tint, node, resource.id, 'template', tintConfigDir, createScope(tint))
        );
    });

    return Q.all(promises);
}

function installContainerResources(tint, nodes, service, daemon) {
    var promises = [];

    nodes.forEach(function(node) {
        promises.push(installResourcesForContainerOnNode(tint, node, service, daemon));
    });

    return Q.all(promises);
}

function installResourcesForContainerOnNode(tint, node, service, daemon) {
    logger.debug('create the resources needed by the service daemon');

    var volumes = daemon.configuration.Mounts;

    logger.debug('Iterate the volumes as they are defined in the daemon configuration');
    var promises = [];

    if (volumes) {
        volumes.forEach(function (volume) {
            promises.push(
                installResourcesForContainerVolumeOnNode(tint, node, service, daemon, volume)
            )
        });
    }

    return Q.all(promises);
}

function installResourcesForContainerVolumeOnNode(tint, node, service, daemon, volume) {
    var tintFsDir = settings.get('data_dir') + '/tints/' + tu.id(tint) + '/resources';

    var filename;
    if (volume.Source.indexOf('resource:') == 0) {
        // -- mount a configuration volume. This means we will take the data from consul and generate it into the
        // -- configuration folder on the FS
        filename = volume.Source.substr('resource:'.length);
        if (filename.indexOf('/') == 0) filename = filename.substring(1);

        volume.Source = tintFsDir + '/' + filename;
        return Q();

    } else return Q();
}

// ====================================================================================================================
// == Remove
// ====================================================================================================================

function removeResources() {
    return kv.list({key: 'nodes', separator: '/'}).then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {


            promises.push(
                kv.multiflag('nodes/' + node + '/resources', 999)
                    .then(function() { events.fire(eventNames.RESOURCE_CLEANUP_PENDING, { node: node });})
            );
        });

        return Q.all(promises);
    });
}

function removeTintResources(tint) {
    var promises = [];

    getNodesForTint(tint).then(function(nodes) {
        nodes.forEach(function(node) {
            promises.push(removeTintResourcesOnNode(tint, node));
        });
    });

    return Q.all(promises)
}

function removeTintResourcesOnNode(tint, node) {
    logger.info('Flagging tint resources for removal');
    return kv.multiflag('nodes/' + node.id + '/resources/' + tu.id(tint), 999).then(function() {
        events.fire(eventNames.RESOURCE_UNINSTALL_PENDING, {tint: tu.id(tint), node: node.id});
    });
}

function registerResourceOnNode(tint, node, resourceName, resourceType, resourceFsPath, resourceScope) {
    return kv.set('nodes/' + node.id + '/resources/' + tu.id(tint) + '/' + resourceName, {
        id: resourceName,
        type: resourceType,
        tint: tu.id(tint),
        node: node.id,
        consulPath: 'resources/' + tu.id(tint) + '/' + resourceName,
        fsPath: resourceFsPath,
        scope: resourceScope
    }, null, 0).then(function() {
        events.fire(eventNames.RESOURCE_INSTALL_PENDING, {tint: tu.id(tint), resource: resourceName, node: node.id});
    });
}

function createScope(tint) {
    var tintId = tu.id(tint);

    var variables = {
        settings: settings.get('data_dir'),
        device: nodeInfo,
        data_dir: settings.get('data_dir') + '/tints/' + tintId + '/data',
        resources_dir: settings.get('data_dir') + '/tints/' + tintId + '/resources',
        config_dir: settings.get('data_dir') + '/tints/' + tintId + '/resources/config'
    };

    return variables;
}