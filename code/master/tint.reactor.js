var events = require('../store/events'),
    kv = require('../store/kv'),
    tu = require('../utils/tint-utils'),
    Q = require('q');

var DaemonDispatcher = require('./daemon.dispatcher');
var ResourceDispatcher = require('./resource.dispatcher');

var ResourceProviders = require('./resources');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('reactor.tint');

module.exports = {
    processError: processError,
    processCreate: processCreate,
    processRemove: processRemove,
    processCleanup: processCleanup,
    processStart: processStart,
    processStop: processStop
};

function processError(error) {
    logger.error("Internal Error: " + error);
}

function processCreate(key, tint) {
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
            return DaemonDispatcher.install.byTint(tint);
        })
        .then(function() {
            logger.debug('flagging the tint as being ready');
            return kv.flag(key, 2);
        }).fail(function(error) {
            logger.error(error);
        });
}

function processRemove(key, tint) {
    logger.debug('removing containers and resources from the nodes');
    return DaemonDispatcher.remove.byTint(tint)
        .then(function() {
            return ResourceDispatcher.remove.byTint(tint);
        }).then(function() {
            return kv.remove.prefix('resources')
        }).then(function() {
            logger.debug('removing the tint from the consul store');
            return kv.remove.prefix(key);
        }).then(
            function() { events.fire(events.names.TINT_UNINSTALL_SUCCESS, {tint: tu.id(tint)}); },
            function(error) { events.fire(events.names.TINT_UNINSTALL_FAILED, {tint: tu.id(tint), error: error.message}); }
        );
}

function processCleanup(key, data) {
    logger.debug('removing containers and resources from the nodes');
    return Q.all([
        DaemonDispatcher.remove.all(),
        ResourceDispatcher.remove.all()
    ]).then(function() {
        logger.debug('removing all tints from the consul store');
        return kv.remove.prefix('/tints/');
    });
}

function processStart(key, data) {
    return Q();
}

function processStop(key, data) {
    return Q();
}

function loadResourceIntoConsul(tint, resourceDefinition) {
    var provider = ResourceProviders[resourceDefinition.provider];
    if (! provider) return Q.reject('Unable to find provider ' + resourceDefinition.provider);

    var pathInConsul = "resources/" + tu.id(tint) + "/" + resourceDefinition.id;

    events.fire(events.names.RESOURCE_LOAD, events.state.PENDING, { tint: tu.id(tint), resource: resourceDefinition.id });

    return provider.toConsul(pathInConsul, resourceDefinition.settings).then(function() {
        events.fire(events.names.RESOURCE_LOAD, events.state.SUCCESS, { tint: tu.id(tint), resource: resourceDefinition.id });
        logger.info('Moved the configuration resource into consul');
    }, function(error) {
        events.fire(events.names.RESOURCE_LOAD, events.state.FAILED, { tint: tu.id(tint), resource: resourceDefinition.id, error: error.message });
    });
}
