var Q = require('q'),
    kv = require('../store/kv'),
    tu = require('../utils/tint-utils');

var log4js = require('log4js');
var logger = log4js.getLogger('watcher.tint');

var events = require('../store/events'),
    eventNames = require('../event_names');

var ResourceProviders = require('./resources');

var ContainerDispatcher = require('./daemon.dispatcher.js');
var ResourceDispatcher = require('./resource.dispatcher');

module.exports = {
    created: created,
    ready: ready,
    updated: updated,
    removed: removed,
    cleanup: cleanup,
    error: error
};

function ready(tint) {
    events.fire(eventNames.TINT_INSTALL_SUCCESS, {tint: tu.id(tint)});
}

function created(tint, key) {
    var promises = [];
    tint.resources.forEach(function(resource) {
        promises.push(loadResourceIntoConsul(tint, resource))
    });

    return Q.all(promises)
        .then(function() {
            logger.info('distributing resources to nodes');
            return ResourceDispatcher.install.byTint(tint);
        })
        .then(function() {
            logger.info('distributing containers to nodes');
            return ContainerDispatcher.install.byTint(tint);
        })
        .then(function() {
            logger.debug('flagging the tint as being ready');
            return kv.flag(key, 2);
        }).fail(function(error) {
            logger.error(error);
        });
}

function updated(tint) {

}

function removed(tint, key) {
    logger.debug('removing containers and resources from the nodes');
    return ContainerDispatcher.remove.byTint(tint)
        .then(function() {
            return ResourceDispatcher.remove.byTint(tint);
        }).then(function() {
            return kv.remove.prefix('resources')
        }).then(function() {
            logger.debug('removing the tint from the consul store');
            kv.remove.prefix(key);
        }).then(
            function() { events.fire(eventNames.TINT_UNINSTALL_SUCCESS, {tint: tu.id(tint)}); },
            function(error) { events.fire(eventNames.TINT_UNINSTALL_FAILED, {tint: tu.id(tint), error: error.message}); }
        );
}

function cleanup() {
    logger.debug('removing containers and resources from the nodes');
    return Q.all([
        ContainerDispatcher.remove.all(),
        ResourceDispatcher.remove.all()
    ]).then(function() {
        logger.debug('removing all tints from the consul store');
        kv.remove.prefix('/tints/');
    });
}

function error(err) {

}

function loadResourceIntoConsul(tint, resourceDefinition) {
    var provider = ResourceProviders[resourceDefinition.provider];
    if (! provider) return Q.reject('Unable to find provider ' + resourceDefinition.provider);

    var pathInConsul = "resources/" + tu.id(tint) + "/" + resourceDefinition.id;

    events.fire(eventNames.RESOURCE_LOAD_PENDING, { tint: tu.id(tint), resource: resourceDefinition.id });

    return provider.toConsul(pathInConsul, resourceDefinition.settings).then(function() {
        events.fire(eventNames.RESOURCE_LOAD_SUCCESS, { tint: tu.id(tint), resource: resourceDefinition.id });
        logger.info('Moved the configuration resource into consul');
    }, function(error) {
        events.fire(eventNames.RESOURCE_LOAD_FAILED, { tint: tu.id(tint), resource: resourceDefinition.id, error: error.message });
    });
}