var daemon = require('./daemon'),
    system = require('./system'),
    Q = require('q');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('local.watcher.daemon');

module.exports = {
    processError: processError,
    processCreate: processCreate,
    processUpdate: processUpdate,
    processRemove: processRemove,
    processCleanup: processCleanup,
    processStart: processStart,
    processStop: processStop
};

function processError(error) {
    logger.error(error);
}

function processCreate(key, data) {
    logger.info('Creating daemon ' + data.id);

    return daemon.create(data).then(
        function() { logger.info('created daemon ' + data.id) },
        function(error) { logger.error(error); }
    );
}

function processUpdate(key, data) {
    return Q();
}

function processRemove(key, data) {
    logger.info('Removing daemon ' + data.id);

    return daemon.remove(data).then(
        function() { logger.info('removed daemon ' + data.id) },
        function(error) { logger.error(error); }
    );
}

function processCleanup(key, data) {
    logger.info('Removing all daemons');

    return daemon.clean().then(
        function() { logger.info('removed all daemons') },
        function(error) { logger.error(error); }
    );
}

function processStart(key, data) {
    logger.info('Starting daemon ' + data.id);

    return daemon.start().then(
        function() { logger.info('started daemon ' + data.id) },
        function(error) { logger.error(error); }
    );
}

function processStop(key, data) {
    logger.info('Stopping daemon ' + data.id);

    return daemon.stop().then(
        function() { logger.info('stopped daemon ' + data.id) },
        function(error) { logger.error(error); }
    );
}