var Q = require('q'),
    Watcher = require('../cluster/storage/watcher'),
    Introspecter = require('../introspecter'),
    system = require('./system'),
    settings = require('../settings'),
    session = require('../store/session'),
    kv = require('../store/kv'),
    log4js = require('log4js'),
    su = require('../utils/sys-utils'),
    consulUtils = require('../utils/consul-utils'),
    ConsulDaemon = require('../daemons/consul'),
    ScopedStorage = require('../cluster/storage');

var localWatchers = {
    resource: new Watcher('nodes/' + system.id + '/resources', null, require('./resource.reactor')),
    daemon: new Watcher('nodes/' + system.id + '/daemons', null, require('./daemon.reactor'))
};

var logger = log4js.getLogger('node.' + system.id);
var tickerLog = log4js.getLogger('ticker.' + system.id);

var fabricSessionId = null;
var ticker = null;
var consulDaemon = new ConsulDaemon();
var storage = new ScopedStorage();

module.exports = {
    isRunning: isRunning,
    start: start,
    stop: stop
};

function start() {
    if (! settings.has('cluster_key'))
        return Q.reject('This node has not been linked to a cluster yet');

    var ip = su.ip(settings.get('nic'));
    if (! ip) return Q.reject('No ip address could be resolved');

    var id = su.id(settings.get('nic'));
    if (! id) return Q.reject('No node id could be resolved');

    // -- construct the consul arguments
    var consul_args = [
        'agent',
        '-node=' + id,
        '-advertise=' + ip,
        '-bootstrap-expect=' + settings.get('cluster_servers'),
        '-dc=' + settings.get('cluster_name'),
        '-data-dir=' + settings.get('data_dir'),
        '-domain=' + settings.get('cluster_name') + '.',
        '-encrypt=' + settings.get('cluster_key'),
        '-ui'
    ];

    settings.get('cluster_nodes', []).forEach(function(other_node) {
        consul_args.push('-retry-join=' + other_node);
    });

    if (settings.get('cluster_role', 'client') == 'server') consul_args.push('-server');

    // -- start the consul daemon
    return consulDaemon.start(consul_args)
        .then(function() {
            return session.create('Fabric', 'delete');
        })
        .then(function(sessionId) {
            fabricSessionId = sessionId;

            logger.info('created the fabric session with id ' + sessionId);

            return Introspecter();
        })
        .then(function(data) {
            return kv.set('nodes/' + data.deviceId, data, fabricSessionId).then(function() {
                data.sessionId = fabricSessionId;

                return data;
            });
        })
        .then(function() {
            localWatchers.daemon.start();
            localWatchers.resource.start();
        })
        .then(function() {
            logger.debug('Start ticking');
            ticker = setInterval(function() {
                session.renew(fabricSessionId).then(function() {
                    tickerLog.trace("Renewed the fabric session");
                }, function (error) {
                    tickerLog.warn("Unable to renew the fabric session: " + error);
                });
            }, 15 * 1000)
        })
        .then(function() {
            // -- start the daemons that need to be started
            return kv.children('nodes/' + system.id + '/daemons/').then(function(tintOwners) {
                var promises = [];

                tintOwners.forEach(function(ownerKey) {
                    promises.push(kv.children(ownerKey).then(function(tintKeys) {
                        var promises = [];

                        tintKeys.forEach(function(tintKey) {
                            promises.push(kv.children(tintKey).then(function(daemonKeys) {
                                var promises = [];

                                daemonKeys.forEach(function(daemonKey) {
                                    promises.push(storage.signal(daemonKey, consulUtils.flags.START));
                                });

                                return Q.all(promises);
                            }));
                        });

                        return Q.all(promises);
                    }));
                });

                return Q.all(promises);
            })
        })
        .then(function() {
            logger.info("Node up and running!");
        })
        .fail(function(error) {
            logger.error('Fabric session creation failed!');
            logger.error(error);
        });
}

function isRunning() {
    return consulDaemon.isRunning();
}

function stop() {
    if (! settings.has('cluster_key'))
        return Q.reject('This node has not been linked to a cluster yet');

    // -- stop the watchers
    localWatchers.daemon.stop();
    localWatchers.resource.stop();

    if (ticker) clearInterval(ticker);

    return session.invalidate(sessions.fabric).then(function() {
        logger.warn("Invalidated the fabric session");
        return consulDaemon.stop()
    }, function (error) {
        logger.error("Unable to invalidate the fabric session: " + error);
    });
}