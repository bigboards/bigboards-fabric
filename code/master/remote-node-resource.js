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

RemoteResource.prototype.create = function(appId, resourceId, resourceType, resourceFsPath, resourceScope) {
    var me = this;
    var definition = {
        id: resourceId,
        type: resourceType,
        app: appId,
        consulPath: 'apps/' + appId + '/resources/' + resourceId,
        fsPath: resourceFsPath,
        scope: resourceScope
    };

    return this.storage.create(appId + '/' + resourceId, definition)
        .then(function() {
            logger.debug('Created resource ' + resourceId + ' on node ' + me.nodeId + '.');
        }, function(error) {
            logger.warn(error);
            return error;
        });
};

RemoteResource.prototype.removeForApp = function(appId) {
    var me = this;

    return me.storage.childKeys(appId)
        .then(function(resourceKeys) {
            var promises = [];

            resourceKeys.forEach(function(resourceKey) {
                promises.push(me.storage.remove(resourceKey))
            });

            return Q.all(promises);
        })
        .then(function() {
            // -- remove the key app key from the node
            return me.storage.removeSync(appId);
        });
};

RemoteResource.prototype.removeAll = function() {
    var me = this;

    return me.storage.childKeys().then(function(nodeAppKeys) {
        var promises = [];

        nodeAppKeys.forEach(function(nodeAppKey) {
            var appId = nodeAppKey.substring(nodeAppKey.lastIndexOf('/'));

            promises.push(me.removeForApp(appId));
        });

        return Q.all(promises);
    });
};

module.exports = RemoteResource;