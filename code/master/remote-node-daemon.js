var cluster = require('../store/cluster'),
    consulUtils = require('../utils/consul-utils'),
    Q = require('q');

// -- storage
var ScopedStorage = require('../cluster/storage');

// -- logging
var log4js = require('log4js');
var logger = log4js.getLogger('remote.daemon');

function RemoteDaemon(nodeId) {
    this.nodeId = nodeId;
    this.storage = new ScopedStorage('nodes/' + nodeId + '/daemons');
}

RemoteDaemon.prototype.create = function(tintId, serviceId, daemonId, daemonDriver, daemonInstanceExpression, daemonConfiguration) {
    var daemonInstance = {
        id: serviceId + '-' + daemonId + '-' + this.nodeId,
        service: serviceId,
        daemon: daemonId,
        driver: daemonDriver,
        instances: daemonInstanceExpression,
        configuration: daemonConfiguration
    };

    return this.storage.create(tintId + '/' + daemonInstance.id, daemonInstance);
};

RemoteDaemon.prototype.removeAll = function() {
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

RemoteDaemon.prototype.removeForTint = function(tintId) {
    var me = this;

    return me.storage.childKeys(tintId)
        .then(function(daemonKeys) {
            // -- remove all the daemons
            var promises = [];

            daemonKeys.forEach(function(daemonKey) {
                promises.push(me.storage.remove(daemonKey))
            });

            return Q.all(promises);
        })
        .then(function() {
            // -- remove the key tint key from the node
            return me.storage.removeSync(tintId);
        });
};

RemoteDaemon.prototype.startDaemon = function(tintId, serviceId, daemonId) {
    var me = this;
    var daemonInstanceId = serviceId + '-' + daemonId + '-' + this.nodeId;

    logger.info('[ START ] daemon ' + daemonInstanceId);
    return me.storage.signal(tintId + '/' + daemonInstanceId, consulUtils.flags.START).then(function() {
        logger.info('[ START ] daemon ' + daemonInstanceId + " OK");
    }, function(error) {
        logger.error('[START] daemon ' + daemonInstanceId + " FAILED: " + error);
    });
};

RemoteDaemon.prototype.stopDaemon = function(tintId, serviceId, daemonId) {
    var me = this;
    var daemonInstanceId = serviceId + '-' + daemonId + '-' + this.nodeId;

    logger.info('[ STOP ] daemon ' + daemonInstanceId);
    return me.storage.signal(tintId + '/' + daemonInstanceId, consulUtils.flags.STOP).then(function() {
        logger.info('[ STOP ] daemon ' + daemonInstanceId + " OK");
    }, function(error) {
        logger.error('[STOP] daemon ' + daemonInstanceId + " FAILED: " + error);
    });
};

module.exports = RemoteDaemon;