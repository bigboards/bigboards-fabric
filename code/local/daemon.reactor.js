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
    return daemon.create(data);
}

function processUpdate(key, data) {
    return Q();
}

function processRemove(key, data) {
    return daemon.remove(data);
}

function processCleanup(key, data) {
    return daemon.clean();
}

function processStart(key, data) {
    return daemon.start();
}

function processStop(key, data) {
    return daemon.stop();
}