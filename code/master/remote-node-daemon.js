var events = require('../store/events'),
    kv = require('../store/kv'),
    system = require('./system'),
    settings = require('../settings'),
    Q = require('q');

// -- utilities
var consulUtils = require('../utils/consul-utils'),
    shellUtils = require('../utils/sh-utils');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('remote.daemon');

module.exports = {
    create: createDaemon,
    remove: removeDaemon,
    clean: cleanDaemons,
    start: startDaemon,
    stop: stopDaemon
};

function createDaemon(nodeId, tintId, serviceId, daemonId, instanceSequence, daemonDriver, daemonInstanceExpression, daemonConfiguration) {
    var daemonInstance = {
        id: serviceId + '-' + daemonId + '-' + instanceSequence,
        service: serviceId,
        daemon: daemonId,
        driver: daemonDriver,
        instances: daemonInstanceExpression,
        configuration: daemonConfiguration
    };

    var evt = { tint: tintId, service: serviceId, daemon: daemonId, node: nodeId};

    var consulKey = 'nodes/' + nodeId + '/daemons/' + tintId + '/' + daemonInstance.id;
    return kv.set(consulKey, daemonInstance, null, 0)
        .then(function() {
            events.fire(events.names.DAEMON_INSTALL, events.state.PENDING, evt);
        })
        .then(function() {
            return events.on(events.names.DAEMON_INSTALL + '@' + evt.id)
                .then(function() { return kv.flag(consulKey, 2); });
        });
    }

function removeDaemon() {
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

function cleanDaemons() {


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

function startDaemon() {

}

function stopDaemon() {

}