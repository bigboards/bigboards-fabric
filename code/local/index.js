var Q = require('q'),
    Introspecter = require('../introspecter'),
    system = require('./system'),
    settings = require('../settings'),
    session = require('../store/session'),
    kv = require('../store/kv'),
    log4js = require('log4js'),
    su = require('../utils/sys-utils'),
    ConsulDaemon = require('../daemons/consul'),
    NomadDaemon = require('../daemons/nomad');

var logger = log4js.getLogger('node.' + system.id);
var tickerLog = log4js.getLogger('ticker.' + system.id);

var fabricSessionId = null;
var ticker = null;
var consulDaemon = new ConsulDaemon();
var nomadDaemon = new NomadDaemon();

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
        '-data-dir=' + settings.get('data_dir') + '/consul',
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
            logger.trace('Start ticking');
            ticker = setInterval(function() {
                session.renew(fabricSessionId).then(function() {
                    tickerLog.trace("Renewed the fabric session");
                }, function (error) {
                    tickerLog.warn("Unable to renew the fabric session: " + error);
                });
            }, 15 * 1000)
        })
        .then(function() {
            logger.info("Node up and running!");
        })
        .then(function() {
            logger.info("Starting Nomad");

            var nomad_args = [
                'agent',
                '-node=' + id,
                // '-bind=' + ip,
                '-bootstrap-expect=' + settings.get('cluster_servers'),
                '-config=' + settings.path('nomad_config_file'),
                '-dc=' + settings.get('cluster_name'),
                '-client',
                '-network-speed=100',
                '-data-dir=' + settings.get('data_dir') + "/nomad"
            ];

            settings.get('cluster_nodes', []).forEach(function(other_node) {
                nomad_args.push('-retry-join=' + other_node);
            });

            if (settings.get('cluster_role', 'client') == 'server') nomad_args.push('-server');

            return nomadDaemon.start(nomad_args)
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

    if (ticker) clearInterval(ticker);

    return session.invalidate(sessions.fabric).then(function() {
        logger.warn("Invalidated the fabric session");
        return consulDaemon.stop()
    }, function (error) {
        logger.error("Unable to invalidate the fabric session: " + error);
    });
}