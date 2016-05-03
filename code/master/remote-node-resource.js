var events = require('../store/events'),
    kv = require('../store/kv'),
    settings = require('../settings'),
    Q = require('q'),
    uuid = require('node-uuid');

// -- storage
var ScopedStorage = require('../cluster/storage');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('remote.resource');

function RemoteResource(nodeId) {
    this.nodeId = nodeId;
    this.storage = new ScopedStorage('nodes/' + nodeId + '/resources');
    this.logger = log4js.getLogger('remote.' + nodeId + '.resource');

    this.logger.debug("created ScopedStorage nodes/" + nodeId);
}

RemoteResource.prototype.create = function(tintId, resourceId, resourceType, resourceFsPath, resourceScope) {
    var me = this;
    var definition = {
        id: resourceId,
        type: resourceType,
        tint: tintId,
        consulPath: 'tints/' + tintId + '/resources/' + resourceId,
        fsPath: resourceFsPath,
        scope: resourceScope
    };

    return this.storage.create(tintId + '/' + resourceId, definition)
        .then(function() {
            logger.debug('Created resource ' + resourceId + ' on node ' + me.nodeId + '.');
        }, function(error) {
            logger.warn(error);
            return error;
        });
};

RemoteResource.prototype.removeForTint = function(tintId) {
    var me = this;

    return me.storage.childKeys(tintId)
        .then(function(resourceKeys) {
            var promises = [];

            resourceKeys.forEach(function(resourceKey) {
                promises.push(me.storage.remove(resourceKey))
            });

            return Q.all(promises);
        })
        .then(function() {
            // -- remove the key tint key from the node
            return me.storage.removeSync(tintId);
        });
};

RemoteResource.prototype.removeAll = function() {
    var me = this;

    return me.storage.childKeys().then(function(nodeTintKeys) {
        var promises = [];

        nodeTintKeys.forEach(function(nodeTintKey) {
            var tintId = nodeTintKey.substring(nodeTintKey.lastIndexOf('/'));

            promises.push(me.removeForTint(tintId));
        });

        return Q.all(promises);
    });
};

module.exports = RemoteResource;