var resource = require('./resource'),
    system = require('./system'),
    settings = require('../settings'),
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

function processRemove(key) {
    // -- a resource you want to remove has no data associated with it since it is merely a folder holding
    // -- the actual resources. This means we need to parse the key and pass that result.
    var regex = new RegExp("nodes/(.*)/resources/(.*)/(.*)/(.*)");
    var parts = key.match(regex);

    var definition = {
        id: parts[3],
        tint: parts[3],
        consulPath: 'tints/' + parts[2] + '/' + parts[3] + '/resources/' + parts[4],
        fsPath: settings.get('data_dir') + '/tints/' + parts[2] + '/' + parts[3] + '/resources/' + parts[4]
    };

    return resource.remove(definition);
}

function processCleanup() {
    return resource.clean();
}