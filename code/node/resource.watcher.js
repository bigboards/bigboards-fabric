var device = require('../device/device.manager'),
    kv = require('../store/kv');

var log4js = require('log4js');
var logger = log4js.getLogger('watcher.node.resource');
var node = require('./node');

module.exports = {
    created: created,
    removed: removed,
    cleanup: cleanup
};

function created(resourceDefinition, key) {
    logger.debug('Creating resource ' + resourceDefinition.fsPath);
    return node.resource.create(resourceDefinition)
        .then(function() {
            logger.debug('Flagging the resource ' + resourceDefinition.fsPath + ' as ready');
            return kv.flag(key, 2);
        }).fail(function(error) {
            logger.error(error);
        });
}

function removed(resourceDefinition, key) {
    logger.debug('Removing resource ' + resourceDefinition.fsPath);
    return node.resource.remove(resourceDefinition)
        .then(function() {
            logger.debug('Removing the resource ' + resourceDefinition.fsPath + ' from consul');
            return kv.remove.key(key);
        });
}

function cleanup() {
    logger.debug('Removing all resources');
    return node.resource.removeAll()
        .then(function(data) {
            logger.debug('Removing all resources from consul');
            return kv.remove.prefix('nodes/' + device.id + '/resources');
        }, function(error) {
            logger.debug("Error occured! " + error);
        });
}