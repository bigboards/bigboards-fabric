var log4js = require('log4js');
var logger = log4js.getLogger('cluster');
var settings = require('../settings');
var Errors = require('../errors');
var consul = require('consul')();
var Q = require('q');
var system = require('../local/system');

var localNode = require('../local');

var store = {
    kv: require('../store/kv'),
    session: require('../store/session')
};

module.exports = {
    status: status,
    join: join,
    leave: leave,
    start: start,
    stop: stop
};

function join(clusterName, encryptionKey, role, other_nodes, servers) {
    if (settings.has('cluster_key')) {
        return Q.reject(new Errors.BadRequestError("This node has already been linked to a cluster. Try to un-link it first."));
    }

    settings.set("cluster_key", encryptionKey);
    settings.set("cluster_name", clusterName);
    settings.set("cluster_nodes", other_nodes);
    settings.set("cluster_role", role);
    settings.set("cluster_servers", servers);

    return start().then(function() { return {status: 'ok'}});
}

function leave() {
    if (! settings.has('cluster_key')) {
        return Q.reject(new Errors.BadRequestError("This node has not been linked to a cluster."));
    }

    logger.info("leaving!");

    return stop().then(function() {
        settings.remove("cluster_key");
        settings.remove("cluster_name");
        settings.remove("cluster_nodes");
        settings.remove("cluster_role");
        settings.remove("cluster_servers");

        return {status: 'ok'};
    });
}

function start() {
    return localNode.start();
}

function stop() {
    return localNode.stop();
}

function status() {
    return localNode.isRunning()
        .then(function(running) {
            return  {
                joined: settings.has('cluster_key'),
                started: running
            }
        });
}

