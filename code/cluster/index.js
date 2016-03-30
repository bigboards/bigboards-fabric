var log4js = require('log4js');
var logger = log4js.getLogger('cluster');
var Watcher = require('../utils/watcher');

var consul = require('consul')();
var config = require('../config').lookupEnvironment();
var device = require('../device/device.manager');
var node = require('../node/node');

var Introspecter = require('../introspecter');

var store = {
    kv: require('../store/kv'),
    session: require('../store/session')
};

var watcher = new Watcher();
var watches = {
    tint: null,
    node: {
        container: null,
        resource: null,
        hive: null
    }
};

module.exports = {
    start: participate
};

function participate(localPort) {
    return setNodeData().then(function(data) {
        return registerNode(data.ipv4, localPort)
    });
}

function setNodeData() {
    return store.session.create('Fabric', 'delete').then(function(sessionId) {
        return Introspecter().then(function(data) {
            return store.kv.set('nodes/' + data.deviceId, data, sessionId).then(function() {
                data.sessionId = sessionId;

                return data;
            });
        });
    });
}

function registerNode(localIp, localPort) {
    return store.session.create('Cluster', 'release').then(function(sessionId) {
        logger.debug('Registered cluster session ' + sessionId);

        logger.debug('Start watching for containers on this node');
        watcher.registerHandler('node.daemon', require('../node/daemon-instance.watcher.js'));
        watches.node.container = watcher.watchChanges('node.daemon', consul.kv.get, { key: 'nodes/' + device.id + '/daemons', recurse: true });

        logger.debug('Start watching for resources on this node');
        watcher.registerHandler('node.resource', require('../node/resource.watcher'));
        watches.node.resource = watcher.watchChanges('node.resource', consul.kv.get, { key: 'nodes/' + device.id + '/resources', recurse: true });

        logger.debug('Start watching for hive changes on this node');
        watcher.registerHandler('node.hive', require('../node/hive.watcher'));
        watches.node.hive = watcher.watchChanges('node.hive', consul.kv.get, { key: 'hive', recurse: true });

        return raceForLeader(localIp, localPort, sessionId);
    });
}

function raceForLeader(localIp, localPort, sessionId) {
    logger.debug('Participating in the cluster');

    // -- try to become the leader
    var dataForLeader = {
        address: localIp,
        port: localPort
    };

    store.kv.set('leader', dataForLeader, sessionId).then(function(success) {
        if (success) {
            logger.info('Became the leader!');
            connected(true);
        } else {
            store.kv.get.key('leader').then(function(leaderData) {
                if (leaderData.address == localIp) {
                    logger.info('Became the leader!');
                    connected(true, localIp, localPort);
                } else {
                    logger.info("I'm just another minion");
                    connected(false, localIp, localPort);
                }
            });
        }
    }).fail(function(error) {
        logger.error(error);
    });
}

function connected(leader, localIp, localPort) {
    if (leader) {
        logger.debug('Start watching for tints');
        watcher.registerHandler('tint', require('../tint/tint.watcher'));
        watches.tint = watcher.watchChanges('tint', consul.kv.get, { key: 'tints', recurse: true });
    } else {
        var watch = store.kv.watch('leader');
        watch.on('change', function(data, res) {
            if (data.Session) return;

            logger.info('The leader has moved out, time to rally');
            watch.end();
            logger.debug('Stopped the watch');

            disconnected();

            raceForLeader(localIp, localPort, sessionId);
        });
    }
}

function disconnected() {
    if (watches.tint) {
        logger.debug('Stop watching for tints');
        watches.tint.end();
        watches.tint = null;
    }
}


