var events = require('../store/events'),
    kv = require('../store/kv'),
    settings = require('../settings'),
    Q = require('q'),
    uuid = require('node-uuid');

// -- utilities
var consulUtils = require('../utils/consul-utils'),
    shellUtils = require('../utils/sh-utils');

// -- storage
var ScopedStorage = require('../cluster/storage');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('remote.resource');

function RemoteResource(nodeId) {
    this.nodeId = nodeId;
    this.storage = new ScopedStorage('nodes/' + nodeId);
    this.logger = log4js.getLogger('remote.' + nodeId + '.resource');

    this.logger.debug("created ScopedStorage nodes/" + nodeId);
}

RemoteResource.prototype.create = function(tintId, resourceId, resourceType, resourceFsPath, resourceScope) {
    var me = this;
    var definition = {
        id: resourceId,
        type: resourceType,
        tint: tintId,
        consulPath: 'resources/' + tintId + '/' + resourceId,
        fsPath: resourceFsPath,
        scope: resourceScope
    };

    return this.storage.create('resources/' + tintId + '/' + resourceId, definition).then(function() {
        logger.debug('Created resource ' + resourceId + ' on node ' + me.nodeId + '.');
    });
};

RemoteResource.prototype.removeForTint = function(tintId) {
    return this.storage.remove('resources/' + tintId);
};

RemoteResource.prototype.removeAll = function() {
    return storage.childKeys('resources/').then(function(nodeTintKeys) {
        var promises = [];

        nodeTintKeys.forEach(function(nodeTintKey) {
            promises.push(storage.childKeys(nodeTintKey).then(function(resourceKeys) {
                var promises = [];

                resourceKeys.forEach(function(resourceKey) {
                    promises.push(storage.remove(resourceKey));
                });

                return Q.all(promises);
            }));
        });

        return Q.all(promises);
    });
};

module.exports = RemoteResource;