var device = require('../device/device.manager'),
    kv = require('../store/kv');

var log4js = require('log4js');
var logger = log4js.getLogger('watcher.node.container');
var node = require('./node');

module.exports = {
    created: created,
    ready: ready,
    removed: removed,
    cleanup: cleanup
};

function ready(container) {
    return node.container.start(container.name);
}

function created(container, key) {
    logger.debug('Creating container ' + container.name);

    return node.container.pull(container)
        .then(function() {
            return node.container.create(container);
        }).then(function() {
            logger.debug('Flagging the container ' + container.name + ' as ready');
            return kv.flag(key, 2);
        });
}

function removed(container, key) {
    logger.debug('Removing container ' + container.name);
    return node.container.remove.byName(container.name)
        .then(function() {
            logger.debug('Removing the container ' + container.name + ' from consul');
            return kv.remove.key(key);
        });
}

function cleanup() {
    logger.debug('Removing all containers');
    return node.container.remove.all()
        .then(function() {
            logger.debug('Removing all containers from consul');
            return kv.remove.prefix('nodes/' + device.id + '/containers');
        });
}