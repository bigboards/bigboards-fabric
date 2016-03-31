var kv = require('../store/kv'),
    services = require('../store/services');

var log4js = require('log4js');
var logger = log4js.getLogger('watcher.node.container');
var node = require('./node');
var nodeInfo = require('./index');

module.exports = {
    created: created,
    ready: ready,
    removed: removed,
    cleanup: cleanup
};

function ready(daemonInstance) {
    return node.container.start(daemonInstance.id).then(function() {
        logger.info('Started daemon instance ' + daemonInstance.id);
    });
}

function created(daemonInstance, key) {
    logger.debug('Creating daemon instance ' + daemonInstance.id);

    var serviceDescriptor = {
        name: daemonInstance.id,
        id: daemonInstance.id,
        tags: [ 'docker', daemonInstance.daemon ],
        check: {
            script: __dirname + '/../../scripts/check_docker_container.sh ' + daemonInstance.id,
            interval: '15s'
        }
    };

    var configuration = daemonInstance.configuration;
    configuration.Hostname = daemonInstance.id;
    configuration.name = daemonInstance.id;

    return services.register(serviceDescriptor).then(function() {
        return node.container.pull(configuration).then(function() {
            logger.info('Pulled the image for the ' + daemonInstance.id + ' daemon instance');
        });
    }).then(function() {
        return node.container.create(configuration).then(function() {
            logger.info('The ' + daemonInstance.id + ' daemon instance has been installed');
        }, function(error) {
            logger.error('The container for the ' + daemonInstance.id + ' daemon instance could not be created: ' + error);
        });
    }).then(function() {
        logger.debug('Flagging the daemon instance ' + daemonInstance.id + ' as ready');
        return kv.flag(key, 2);
    });
}

function removed(daemonInstance, key) {
    logger.debug('Removing daemon instance ' + daemonInstance.id);
    return node.container.remove.byName(daemonInstance.id)
        .then(function() {
            logger.info('Removed the ' + daemonInstance.id + ' daemon instance');
            logger.debug('Removing the daemon instance ' + daemonInstance.id + ' from consul');
            return kv.remove.key(key);
        }).then(function() {
            return services.deregister(daemonInstance.id);
        });
}

function cleanup() {
    logger.debug('Removing all daemon instances');
    return node.container.remove.all()
        .then(function() {
            logger.debug('Removing all daemon instances from consul');
            return kv.remove.prefix('nodes/' + nodeInfo.id + '/daemons');
        });
}