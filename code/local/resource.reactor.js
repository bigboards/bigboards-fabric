var resource = require('./resource'),
    system = require('./system'),
    Q = require('q');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('local.watcher.resource');

module.exports = {
    processError: processError,
    processCreate: processCreate,
    processUpdate: processUpdate,
    processRemove: processRemove,
    processCleanup: processCleanup
};

function processError(error) {
    logger.error(error);
}

function processCreate(key, data) {
    return resource.create(data);
}

function processUpdate(key, data) {
    return Q();
}

function processRemove(key, data) {
    return resource.remove(data);
}

function processCleanup(key, data) {
    return resource.clean();
}