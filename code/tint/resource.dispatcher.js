var expression = require('../expression'),
    kv = require('../store/kv'),
    tu = require('../utils/tint-utils'),
    Q = require('q'),
    log4js = require('log4js');

var logger = log4js.getLogger('dispatcher.resource');
var device = require('../device/device.manager');
var config = require('../config').lookupEnvironment();

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
    var promises = [];



    if (tint.type == 'stack') {
        logger.debug('Installing resources for ' + tint.type + ' ' + tint.slug);
        return getNodesForTint(tint)
            .then(function(nodes) {
                var promises = [];

                promises.push(installConfigurationResource(tint, nodes));

                tint.stack.containers.forEach(function(container) {
                    promises.push(installContainerResources(tint, nodes, container));
                });

                return Q.all(promises);
            });
    }

    return Q.all(promises)
}

function getNodesForTint(tint) {
    // -- run through the groups in the tint to see which nodes participate in this tint. Once we have all the nodes,
    // -- we can distribute the resource to them.

    var result = [];

    var promises = [];
    tint.stack.groups.forEach(function(group) {
        promises.push(expression.nodes(group.runs_on).then(function(nodes) {
            nodes.forEach(function(node) {
                if (result.indexOf(node) == -1) result.push(node);
            });
        }));
    });

    return Q.all(promises)
        .then(function() { return result; });
}

function installConfigurationResource(tint, nodes) {
    var promises = [];

    var tintFsDir = config.dir.data + '/tints/' + tu.id(tint) + '/resources';
    var tintConfigDir = tintFsDir + '/config';

    nodes.forEach(function(node) {
        promises.push(registerResourceOnNode(tint, node, 'config', 'template', tintConfigDir, createScope(tint)));
    });

    return Q.all(promises);
}

function installContainerResources(tint, nodes, container) {
    var promises = [];

    nodes.forEach(function(node) {
        promises.push(installResourcesForContainerOnNode(tint, node, container));
    });

    return Q.all(promises);
}

function installResourcesForContainerOnNode(tint, node, container) {
    logger.debug('create the resources needed by the docker container');

    var volumes = container.volumes;
    if (!volumes) return Q();

    logger.debug('Iterate the volumes as they are defined in the container configuration');
    var promises = [];
    volumes.forEach(function(volume) {
        promises.push(installResourcesForContainerVolumeOnNode(tint, node, container, volume))
    });

    return Q.all(promises);
}

function installResourcesForContainerVolumeOnNode(tint, node, container, volume) {
    var tintFsDir = config.dir.data + '/tints/' + tint.id + '/resources';
    var tintConfigDir = tintFsDir + '/config';
    var tintDataDir = tintFsDir + '/data';

    var filename;
    if (volume.host.indexOf('config:') == 0) {
        // -- mount a configuration volume. This means we will take the data from consul and generate it into the
        // -- configuration folder on the FS
        filename = volume.host.substr('config:'.length);
        if (filename.indexOf('/') == 0) filename = filename.substring(1);

        volume.host = tintConfigDir + '/' + filename;
        return Q();

    } else if (volume.host.indexOf('data:') == 0) {
        // -- mount a data directory.
        // -- data directories are used to store data that can be accessed by the host OS while also being available
        // -- inside the container
        filename = volume.host.substr('data:'.length);
        if (filename.indexOf('/') == 0) filename = filename.substring(1);

        volume.host = tintDataDir + '/' + container.name + '/' + filename;
        return registerResourceOnNode(tint, node, 'data/' + filename, 'directory', volume.host, createScope(tint));
    } else return Q();
}

// ====================================================================================================================
// == Remove
// ====================================================================================================================

function removeResources() {
    return kv.list({key: 'nodes', separator: '/'}).then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            promises.push(kv.multiflag('nodes/' + node + '/resources', 999));
        });

        return Q.all(promises);
    });
}

function removeTintResources(tint) {
    var promises = [];

    if (tint.type == 'stack') {
        getNodesForTint(tint).then(function(nodes) {
            nodes.forEach(function(node) {
                promises.push(removeTintResourcesOnNode(tint, node));
            });
        });
    }

    return Q.all(promises)
}

function removeTintResourcesOnNode(tint, node) {
    return kv.multiflag('nodes/' + node + '/resources', 999);
}

function registerResourceOnNode(tint, node, resourceName, resourceType, resourceFsPath, resourceScope) {
    return kv.set('nodes/' + node.id + '/resources/' + tu.id(tint) + '/' + resourceName, {
        type: resourceType,
        consulPath: 'resources/' + tu.id(tint) + '/' + resourceName,
        fsPath: resourceFsPath,
        scope: resourceScope
    }, null, 0);
}

function createScope(tint) {
    var tintId = tu.id(tint);

    var variables = {
        config: config,
        device: device,
        data_dir: config.dir.data + '/tints/' + tintId + '/data',
        resources_dir: config.dir.data + '/tints/' + tintId + '/resources',
        config_dir: config.dir.data + '/tints/' + tintId + '/resources/config'
    };

    return variables;
}