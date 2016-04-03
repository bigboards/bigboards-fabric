var events = require('../store/events'),
    kv = require('../store/kv'),
    system = require('./system'),
    settings = require('../settings'),
    Q = require('q'),
    uuid = require('node-uuid');

// -- utilities
var consulUtils = require('../utils/consul-utils'),
    shellUtils = require('../utils/sh-utils');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('remote.resource');

module.exports = {
    create: createResourceOnNode,
    remove: removeResource,
    clean: cleanResources
};

function createResourceOnNode(tintId, nodeId, resourceId, resourceType, resourceFsPath, resourceScope) {
    var definition = {
        id: resourceId,
        type: resourceType,
        tint: tintId,
        consulPath: 'resources/' + tintId + '/' + resourceId,
        fsPath: resourceFsPath,
        scope: resourceScope
    };

    var evt = {id: uuid.v4(), tint: tintId, resource: resourceId, node: nodeId};

    var consulKey = 'nodes/' + nodeId + '/resources/' + tintId + '/' + resourceId;
    return kv.set(consulKey, definition, null, 0)
        .then(function() {
            return events.fire(events.names.RESOURCE_INSTALL, events.state.PENDING, evt);
        })
        .then(function() {
            return events.on(events.names.RESOURCE_INSTALL + '@' + evt.id)
                .then(function() { return kv.flag(consulKey, 2); });
        });
}

function removeResource(tintId, nodeId, resourceId) {
    var evt = {
        id: uuid.v4(),
        tint: tintId,
        resource: resourceId,
        node: nodeId
    };

    var consulKey = 'nodes/' + nodeId + '/resources/' + tintId;
    return kv.multiflag(consulKey, 999)
        .then(function() {
            events.fire(events.names.RESOURCE_UNINSTALL, events.state.PENDING, evt);
        })
        .then(function() {
            return events.on(events.names.RESOURCE_UNINSTALL + '@' + evt.id)
                .then(function() { return kv.remove.prefix(consulKey); });
        });
}

function cleanResources(nodeId) {
    var evt = {
        id: uuid.v4(),
        node: nodeId
    };

    var consulKey = 'nodes/' + nodeId + '/resources';
    return kv.multiflag(consulKey, 999)
        .then(function() {
            events.fire(events.names.RESOURCE_CLEANUP, events.state.PENDING, evt);
        })
        .then(function() {
            return events.on(events.names.RESOURCE_CLEANUP + '@' + evt.id)
                .then(function() { return kv.remove.prefix(consulKey); });
        });
}