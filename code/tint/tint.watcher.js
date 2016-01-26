var Q = require('q'),
    kv = require('../store/kv'),
    tu = require('../utils/tint-utils');

var log4js = require('log4js');
var logger = log4js.getLogger('watcher.tint');

var ResourceProviders = require('./resources');

var ContainerDispatcher = require('./container.dispatcher');
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

}

function created(tint, key) {
    var resourceDefinition = {
        provider: 'git',
        consulPath: 'resources/' + tu.id(tint),
        url: tint.uri
    };

    return loadResourceIntoConsul(resourceDefinition)
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
        });
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

function loadResourceIntoConsul(resourceDefinition) {
    var provider = ResourceProviders[resourceDefinition.provider];
    if (! provider) return Q.reject('Unable to find provider ' + resourceDefinition.provider);

    return provider.toConsul(resourceDefinition.consulPath, resourceDefinition).then(function() {
        logger.info('Moved the configuration resource into consul');
    });
}