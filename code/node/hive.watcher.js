var log4js = require('log4js');
var logger = log4js.getLogger('watcher.node.hive');

var node = require('./node');
var kv = require('../store/kv');

module.exports = {
    created: register,
    ready: update,
    updated: register,
    removed: remove
};

function register(hiveData, key) {
    if (! hiveData || !hiveData.shortId) return;

    node.hive.register(hiveData.shortId).then(function() {
        logger.info('Linked the device to the hive');
        return kv.flag(key, 2);
    }, function(error) {
        logger.error(error);
    });
}

function update(hiveData, key) {
    if (! hiveData || !hiveData.shortId) return;

    node.hive.update().then(function() {
        logger.info('Updated the device in the hive');
    }, function(error) {
        logger.error(error);
    });
}

function remove(key) {
    return node.hive.deregister().then(function() {
        logger.info('Removed the device from the hive');
    });
}