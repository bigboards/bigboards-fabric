var kv = require('../store/kv');

var log4js = require('log4js');
var logger = log4js.getLogger('watcher.node.resource');
var node = require('./node');
var nodeInfo = require('./index');

var events = require('../store/events'),
    eventNames = require('../event_names');

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

            return kv.flag(key, 2)
        }).then(
            function() { events.fire(eventNames.RESOURCE_INSTALL_SUCCESS, {tint: resourceDefinition.tint, node: resourceDefinition.node, resource: resourceDefinition.id}); },
            function(error) {
                logger.error(error);
                events.fire(eventNames.RESOURCE_INSTALL_FAILED, {tint: resourceDefinition.tint, node: resourceDefinition.node, resource: resourceDefinition.id, error: error.message});
                events.fire(eventNames.TINT_INSTALL_FAILED, {tint: resourceDefinition.tint, error: error.message});
            }
        );
}

function removed(resourceDefinition, key) {
    logger.debug('Removing resource ' + resourceDefinition.fsPath);
    return node.resource.remove(resourceDefinition)
        .then(function() {
            logger.debug('Removing the resource ' + resourceDefinition.fsPath + ' from consul');
            return kv.remove.prefix(key);
        }).then(
            function() { events.fire(eventNames.RESOURCE_UNINSTALL_SUCCESS, {tint: resourceDefinition.tint, node: resourceDefinition.node, resource: resourceDefinition.id}); },
            function(error) {
                events.fire(eventNames.RESOURCE_UNINSTALL_FAILED, {tint: resourceDefinition.tint, node: resourceDefinition.node, resource: resourceDefinition.id, error: error.message});
                events.fire(eventNames.TINT_UNINSTALL_FAILED, {tint: resourceDefinition.tint, error: error.message});
            }
        );
}

function cleanup() {
    logger.debug('Removing all resources');
    return node.resource.removeAll()
        .then(function(data) {
            logger.debug('Removing all resources from consul');
            return kv.remove.prefix('nodes/' + nodeInfo.id + '/resources');
        }).then(
            function() { events.fire(eventNames.RESOURCE_CLEANUP_SUCCESS, {node: nodeInfo.id}); },
            function(error) { events.fire(eventNames.RESOURCE_CLEANUP_FAILED, {node: nodeInfo.id, error: error.message}); }
        );
}