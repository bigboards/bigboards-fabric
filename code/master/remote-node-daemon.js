var cluster = require('../store/cluster');

// -- storage
var ScopedStorage = require('../cluster/storage');

// -- logging
var log4js = require('log4js');

function RemoteDaemon(nodeId) {
    this.nodeId = nodeId;
    this.storage = new ScopedStorage('nodes/' + nodeId);
    this.logger = log4js.getLogger('remote.' + nodeId + '.daemon')
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

    return this.storage.create('daemons/' + tintId + '/' + daemonInstance.id, daemonInstance);
};

RemoteDaemon.prototype.removeAll = function() {
    return storage.childKeys('daemons/').then(function(nodeTintKeys) {
        var promises = [];

        nodeTintKeys.forEach(function(nodeTintKey) {
            promises.push(storage.childKeys(nodeTintKey).then(function(daemonKeys) {
                var promises = [];

                daemonKeys.forEach(function(daemonKey) {
                    promises.push(storage.remove(daemonKey));
                });

                return Q.all(promises);
            }));
        });

        return Q.all(promises);
    });
};

RemoteDaemon.prototype.removeForTint = function(tintId) {
    return storage.childKeys('daemons/' + tintId).then(function(daemonKeys) {
        var promises = [];

        daemonKeys.forEach(function(daemonKey) {
            promises.push(storage.remove(daemonKey))
        });

        return Q.all(promises);
    });
};

RemoteDaemon.prototype.startDaemon = function(nodeId, tintId, serviceId, daemonId) {
    var daemonInstanceId = serviceId + '-' + daemonId + '-' + nodeId;

    storage.signal('daemons/' + tintId + '/' + daemonInstanceId, ScopedStorage.flags.START);
};

RemoteDaemon.prototype.stopDaemon = function(nodeId, tintId, serviceId, daemonId) {
    var daemonInstanceId = serviceId + '-' + daemonId + '-' + nodeId;

    storage.signal('daemons/' + tintId + '/' + daemonInstanceId, ScopedStorage.flags.STOP);
};

module.exports = RemoteDaemon;