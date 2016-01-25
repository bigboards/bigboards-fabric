var device = require('../device/device.manager'),
    kv = require('../store/kv');

var log4js = require('log4js');
var logger = log4js.getLogger('watcher.node.container');
var node = require('./node');

module.exports = {
    created: created,
    ready: ready,
    updated: updated,
    removed: removed,
    cleanup: cleanup,
    error: error
};

function ready(container) {
    return node.container.start(container.name);
}

function created(container, key) {
    logger.debug('Creating container ' + container.Hostname);
    return node.container.create(container.Hostname, container)
        .then(function() {
            logger.debug('Flagging the container ' + container.Hostname + ' as ready');
            return kv.flag(key, 2);
        });
}

function updated(container, key) {
}

function removed(container, key) {
    logger.debug('Removing container ' + container.Hostname);
    return node.container.remove(container.Hostname)
        .then(function() {
            logger.debug('Removing the container ' + container.Hostname + ' from consul');
            return kv.remove.key(key);
        });
}

function cleanup() {
    logger.debug('Removing all containers');
    return node.container.removeAll()
        .then(function() {
            logger.debug('Removing all containers from consul');
            return kv.remove.prefix('nodes/' + device.id + '/containers');
        });
}

function error(err) {

}