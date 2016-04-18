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
            return Q.all([
                ResourceDispatcher.install.byTint(tint),
                DaemonDispatcher.install.byTint(tint)
            ]);
        })
        .then(function() {
            logger.info('starting the daemons');

            return DaemonDispatcher.start(tint);
        }).then(
            function() { logger.info('tint ' + tu.id(tint) + ' up and running') },
            function(error) { logger.error(error); }
        );
}

function processRemove(key, tint) {
    logger.debug('removing containers and resources from the nodes');
    return DaemonDispatcher.stop(tint)
        .then(function() {
            return Q.all([
                DaemonDispatcher.remove.byTint(tint),
                ResourceDispatcher.remove.byTint(tint)
            ]);
        }).then(function() {
            return kv.remove.prefix('resources')
        }).then(function() {
            logger.debug('removing the tint from the consul store');
            return kv.remove.prefix(key);
        });
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

function processStart(key, tint) {
    return DaemonDispatcher.start(tint);
}

function processStop(key, tint) {
    return DaemonDispatcher.stop(tint);
}

function loadResourceIntoConsul(tint, resourceDefinition) {
    var provider = ResourceProviders[resourceDefinition.provider];
    if (! provider) return Q.reject('Unable to find provider ' + resourceDefinition.provider);

    var pathInConsul = "tints/" + tu.id(tint) + "/resources/" + resourceDefinition.id;

    return provider.toConsul(pathInConsul, resourceDefinition.settings).then(function() {
        logger.info('Moved the configuration resource into consul');
    });
}
