var events = require('../store/events'),
    system = require('./system'),
    settings = require('../settings'),
    Q = require('q');

// -- utilities
var consulUtils = require('../utils/consul-utils'),
    shellUtils = require('../utils/sh-utils');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('local.resource');

module.exports = {
    create: createResource,
    remove: removeResource,
    clean: cleanResources
};

function createResource(definition) {
    return consulUtils.kvToFs(definition.consulPath, definition.fsPath, definition.scope);
}

function removeResource(definition) {
    return Q(shellUtils.rm(definition.fsPath, {sudo: settings.get('sudo', false), flags: 'rf'}));
}

function cleanResources() {
    return Q(shellUtils.rm(settings.get('data_dir') + '/tints', {sudo: settings.get('sudo', false), flags: 'rf'}));
}