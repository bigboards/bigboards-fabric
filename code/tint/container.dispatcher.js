var expression = require('../expression'),
    kv = require('../store/kv'),
    tu = require('../utils/tint-utils'),
    Q = require('q'),
    log4js = require('log4js');

var logger = log4js.getLogger('dispatcher.container');
var device = require('../device/device.manager');
var containerModelMapper = require('../model/container/v1.3');

/**
 * The container dispatcher will take a tint and a container definition and generate the container definition and
 * resource definition needed for a node to deploy a container and the resources it requires.
 */
module.exports = {
    install: {
        byTint: installContainersForTint
    },
    remove: {
        all: removeContainers,
        byTint: removeContainersForTint
    }
};

// ====================================================================================================================
// == Install
// ====================================================================================================================
function installContainersForTint(tint) {
    var promises = [];

    if (tint.type == 'stack') {
        tint.stack.groups.forEach(function(group) {
            promises.push(installContainersInGroup(tint, group));
        });
    }

    return Q.all(promises)
}

function installContainersInGroup(tint, group) {
    // -- get the containers for the group
    var containers = _containersForGroup(tint, group);

    return expression.nodes(group.runs_on)
        .then(function(nodes) {
            var promises = [];

            nodes.forEach(function(node) {
                promises.push(installContainersForNode(tint, node, containers));
            });

            return Q.all(promises);
        });
}

function installContainersForNode(tint, node, containers) {
    var promises = [];

    containers.forEach(function (container) {
        logger.debug('scheduled container ' + container.Hostname + ' onto node ' + node.id);
        promises.push(kv.set('nodes/' + node.id + '/containers/' + container.Hostname, container, null, 0));
    });

    return Q.all(promises);
}

// ====================================================================================================================
// == Remove
// ====================================================================================================================

function removeContainers() {
    return kv.list({key: 'nodes', separator: '/'}).then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            promises.push(kv.multiflag('nodes/' + node + '/containers', 999));
        });

        return Q.all(promises);
    });
}

function removeContainersForTint(tint) {
    var promises = [];

    if (tint.type == 'stack') {
        tint.stack.groups.forEach(function(group) {
            promises.push(removeContainersInGroup(tint, group));
        });
    }

    return Q.all(promises)
}

function removeContainersInGroup(tint, group) {
    // -- get the containers for the group
    var containers = _containersForGroup(tint, group);

    return expression.nodes(group.runs_on).then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            promises.push(removeContainersForNode(node, containers));
        });

        return Q.all(promises);
    });
}

function removeContainersForNode(node, containers) {
    var promises = [];

    containers.forEach(function (container) {
        promises.push(kv.set('nodes/' + node.id + '/containers/' + container.name, container, null, 999));
    });

    return Q.all(promises);
}

function _containersForGroup(tint, group) {
    var containers = [];

    group.containers.forEach(function(containerName) {
        tint.stack.containers.forEach(function(container) {
            if (container.name == containerName)
                containers.push(containerModelMapper(container));
        });
    });

    return containers;
}

