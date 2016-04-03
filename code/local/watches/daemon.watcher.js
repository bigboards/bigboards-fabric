var daemon = require('../daemon');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('local.watcher.daemon');

module.exports = {
    created: created,
    removed: removed,
    cleanup: cleanup
};

function created(definition) {
    //logger.debug('Creating daemon ' + definition.id + ' at ' + defintion.fsPath);
    //
    //return resource.create(definition)
    //    .then(function() { logger.debug('Created resource ' + definition.id); });
}

function removed(definition, key) {
    //logger.debug('Removing daemon ' + definition.id + ' from ' + definition.fsPath);
    //
    //return resource.remove(definition, key)
    //    .then(function() { logger.debug('Removed resource ' + definition.id); });
}

function cleanup() {
    //logger.debug('Removing all daemons');
    //
    //return resource.clean()
    //    .then(function() { logger.debug('Removed all resources'); });
}