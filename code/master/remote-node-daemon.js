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

RemoteDaemon.prototype.create = function(appId, serviceId, daemonId, daemonDriver, daemonInstanceExpression, daemonConfiguration) {
    var daemonInstance = {
        id: serviceId + '-' + daemonId + '-' + this.nodeId,
        service: serviceId,
        daemon: daemonId,
        driver: daemonDriver,
        instances: daemonInstanceExpression,
        configuration: daemonConfiguration
    };

    return this.storage.create(appId + '/' + daemonInstance.id, daemonInstance);
};

RemoteDaemon.prototype.removeAll = function() {
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

RemoteDaemon.prototype.removeForApp = function(appId) {
    var me = this;

    return me.storage.childKeys(appId)
        .then(function(daemonKeys) {
            // -- remove all the daemons
            var promises = [];

            daemonKeys.forEach(function(daemonKey) {
                promises.push(me.storage.remove(daemonKey))
            });

            return Q.all(promises);
        })
        .then(function() {
            // -- remove the key app key from the node
            return me.storage.removeSync(appId);
        });
};

RemoteDaemon.prototype.startDaemon = function(appId, serviceId, daemonId) {
    var me = this;
    var daemonInstanceId = serviceId + '-' + daemonId + '-' + this.nodeId;

    logger.info('[ START ] daemon ' + daemonInstanceId);
    return me.storage.signal(appId + '/' + daemonInstanceId, consulUtils.flags.START).then(function() {
        logger.info('[ START ] daemon ' + daemonInstanceId + " OK");
    }, function(error) {
        logger.error('[START] daemon ' + daemonInstanceId + " FAILED: " + error);
    });
};

RemoteDaemon.prototype.stopDaemon = function(appId, serviceId, daemonId) {
    var me = this;
    var daemonInstanceId = serviceId + '-' + daemonId + '-' + this.nodeId;

    logger.info('[ STOP ] daemon ' + daemonInstanceId);
    return me.storage.signal(appId + '/' + daemonInstanceId, consulUtils.flags.STOP).then(function() {
        logger.info('[ STOP ] daemon ' + daemonInstanceId + " OK");
    }, function(error) {
        logger.error('[STOP] daemon ' + daemonInstanceId + " FAILED: " + error);
    });
};

module.exports = RemoteDaemon;