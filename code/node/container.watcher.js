var device = require('../device/device.manager'),
    kv = require('../store/kv'),
    services = require('../store/services');

var log4js = require('log4js');
var logger = log4js.getLogger('watcher.node.container');
var node = require('./node');

module.exports = {
    created: created,
    ready: ready,
    removed: removed,
    cleanup: cleanup
};

function ready(container) {
    return node.container.start(container.name).then(function() {
        logger.info('Started container ' + container.name);
    });
}

function created(container, key) {
    logger.debug('Creating container ' + container.name);

    var serviceDescriptor = {
        name: 'Container ' + container.name,
        id: 'docker-' + container.name,
        tags: [ 'docker' ],
        check: {
            script: __dirname + '/../../scripts/check_docker_container.sh ' + container.name,
            interval: '15s'
        }
    };

    return services.register(serviceDescriptor).then(function() {
        return node.container.pull(container).then(function() {
            logger.info('Pulled the image for the ' + container.name + ' container');
        });
    }).then(function() {
        return node.container.create(container).then(function() {
            logger.info('The ' + container.name + ' container has been installed');
        });
    }).then(function() {
        logger.debug('Flagging the container ' + container.name + ' as ready');
        return kv.flag(key, 2);
    });
}

function removed(container, key) {
    logger.debug('Removing container ' + container.name);
    return node.container.remove.byName(container.name)
        .then(function() {
            logger.info('Removed the ' + container.name + ' container');
            logger.debug('Removing the container ' + container.name + ' from consul');
            return kv.remove.key(key);
        }).then(function() {
            return services.deregister('docker-' + container.name);
        });
}

function cleanup() {
    logger.debug('Removing all containers');
    return node.container.remove.all()
        .then(function() {
            logger.debug('Removing all containers from consul');
            return kv.remove.prefix('nodes/' + device.id + '/containers');
        });
}