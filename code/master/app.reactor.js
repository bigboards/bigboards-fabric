var events = require('../store/events'),
    kv = require('../store/kv'),
    tu = require('../utils/app-utils'),
    Q = require('q');

var DaemonDispatcher = require('./daemon.dispatcher');
var ResourceDispatcher = require('./resource.dispatcher');

var ResourceProviders = require('./resources');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('reactor.app');

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

function processCreate(key, app) {
    var promises = [];
    app.resources.forEach(function(resource) {
        promises.push(loadResourceIntoConsul(app, resource))
    });

    return Q.all(promises)
        .then(function() {
            return Q.all([
                ResourceDispatcher.install.byApp(app),
                DaemonDispatcher.install.byApp(app)
            ]);
        })
        .then(function() {
            logger.info('starting the daemons');

            return DaemonDispatcher.start(app);
        }).then(
            function() { logger.info('app ' + tu.id(app) + ' up and running') },
            function(error) { logger.error(error); }
        );
}

function processRemove(key, app) {
    logger.debug('removing containers and resources from the nodes');
    return Q.all([
                DaemonDispatcher.remove.byApp(app),
                ResourceDispatcher.remove.byApp(app)
            ])
        .then(function() {
            logger.debug('removing the app from the consul store');
            return kv.remove.prefix(key);
        }).then(
            function() { logger.info('app ' + tu.id(app) + ' removed') },
            function(error) { logger.error(error); }
        );
}

function processCleanup(key, data) {
    logger.debug('removing containers and resources from the nodes');
    return Q.all([
        DaemonDispatcher.remove.all(),
        ResourceDispatcher.remove.all()
    ]).then(function() {
        logger.debug('removing all apps from the consul store');
        return kv.remove.prefix('apps/');
    });
}

function processStart(key, app) {
    return DaemonDispatcher.start(app);
}

function processStop(key, app) {
    return DaemonDispatcher.stop(app);
}

function loadResourceIntoConsul(app, resourceDefinition) {
    var provider = ResourceProviders[resourceDefinition.provider];
    if (! provider) return Q.reject('Unable to find provider ' + resourceDefinition.provider);

    var pathInConsul = "apps/" + tu.id(app) + "/resources/" + resourceDefinition.id;

    return provider.toConsul(pathInConsul, resourceDefinition.settings).then(function() {
        logger.info('Moved the configuration resource into consul');
    });
}
