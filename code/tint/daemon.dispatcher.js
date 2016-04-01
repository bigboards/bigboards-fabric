var expression = require('../expression'),
    kv = require('../store/kv'),
    tu = require('../utils/tint-utils'),
    Q = require('q'),
    log4js = require('log4js');

var events = require('../store/events'),
    eventNames = require('../event_names');

var logger = log4js.getLogger('dispatcher.daemon');
var containerModelMapper = require('../model/container/v2.0');

/**
 * The container dispatcher will take a tint and a container definition and generate the container definition and
 * resource definition needed for a node to deploy a container and the resources it requires.
 */
module.exports = {
    install: {
        byTint: installDaemonsForTint
    },
    remove: {
        all: removeDaemons,
        byTint: removeDaemonsForTint
    }
};

// ====================================================================================================================
// == Install
// ====================================================================================================================
function installDaemonsForTint(tint) {
    var promises = [];

    tint.services.forEach(function(service) {
        service.daemons.forEach(function(daemon) {
            promises.push(installDaemon(tint, service, daemon));
        })
    });

    return Q.all(promises)
}

function installDaemon(tint, service, daemon) {
    return expression.nodes(daemon.instances)
        .then(function(nodes) {
            var promises = [];

            var sequence = 0;
            nodes.forEach(function(node) {
                promises.push(installDaemonForNode(tint, node, service, daemon, sequence++));
            });

            return Q.all(promises);
        });
}

function installDaemonForNode(tint, node, service, daemon, sequence) {
    var daemonInstance = {
        id: service.id + '-' + daemon.id + '-' + sequence,
        service: service.id,
        daemon: daemon.id,
        driver: daemon.driver,
        instances: daemon.instances,
        configuration: containerModelMapper(daemon.configuration)
    };

    logger.debug('scheduled daemon ' + daemon.id + ' onto node ' + node.id + ' as container ' + daemonInstance.id);
    return kv.set('nodes/' + node.id + '/daemons/' + tu.id(tint) + '/' + daemonInstance.id, daemonInstance, null, 0).then(function() {
        events.fire(eventNames.DAEMON_INSTALL_PENDING, { tint: tu.id(tint), service: service.id, daemon: daemon.id, node: node.id});
    })
}

// ====================================================================================================================
// == Remove
// ====================================================================================================================

function removeDaemons() {
    return kv.list({key: 'nodes', separator: '/'}).then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            promises.push(kv.multiflag('nodes/' + node + '/daemons', 999).then(function() {
                events.fire(eventNames.DAEMON_CLEANUP_PENDING, { node: node });
            }));
        });

        return Q.all(promises);
    });
}

function removeDaemonsForTint(tint) {
    logger.info('Flagging tint daemons for removal ' + tu.id(tint));

    return kv.list({key: 'nodes/', separator: '/'}).then(function(nodes) {
        var promises = [];

        nodes.forEach(function(node) {
            if (node.lastIndexOf('/') == node.length - 1) {
                promises.push(kv.multiflag(node + 'daemons/' + tu.id(tint), 999).then(function() {
                    events.fire(eventNames.DAEMON_UNINSTALL_PENDING, { node: node, tint: tu.id(tint) });
                }));
            }
        });

        return Q.all(promises);
    });
}
