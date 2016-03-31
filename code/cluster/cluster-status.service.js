var Q = require('q'),
    kv = require('../store/kv'),
    catalog = require('../store/catalog'),
    health = require('../store/health'),
    log4js = require('log4js');

var logger = log4js.getLogger('service.cluster.status');

var settings = require('../settings');

module.exports = {
    status: getStatus
};

function getStatus() {
    logger.debug('Fetching the cluster status');

    return Q.all([_getNodeStatus(), _getTintStatus()]).then(function(results) {
        return {
            cluster: settings.get('cluster_name'),
            tints: results[1],
            nodes: results[0].nodes,
            containers: results[0].containers
        }
    });
}

function _getNodeStatus() {
    logger.debug('Reading the status of the nodes ');

    return kv.get.prefix('nodes').then(function(values) {
        var regex = new RegExp('nodes\/(.*)/daemons\/(.*)');
        var result = {
            nodes: {},
            daemons: {}
        };

        values.forEach(function(value) {
            if (! regex.test(value.Key)) return;

            var parts = regex.exec(value.Key);
            var daemon = parts[2];
            var node = parts[1];

            if (! result.nodes[node]) result.nodes[node] = { daemons: {}, stats: { total: 0, 0: 0, 1: 0, 2: 0, 999: 0} };
            result.nodes[parts[1]].daemons[daemon] = value.Flags;
            result.nodes[node].stats[value.Flags] = result.nodes[node].stats[value.Flags] + 1;
            result.nodes[node].stats.total += 1;

            if (! result.daemons[daemon]) result.daemons[daemon] = { nodes: {}, stats: { total: 0, 0: 0, 1: 0, 2: 0, 999: 0} };
            result.daemons[daemon].nodes[node] = value.Flags;
            result.daemons[daemon].stats[value.Flags] = result.daemons[daemon].stats[value.Flags] + 1;
            result.daemons[daemon].stats.total += 1;
        });

        return result;
    }, function(error) {
        logger.error(error);
    });
}

function _getTintStatus() {
    return kv.get.prefix('tints').then(function(tints) {
        var result = {};

        if (tints) {
            tints.forEach(function (tint) {
                var key = tint.Key.substring('tints/'.length);
                result[key] = tint.Flags;
            });
        }

        return result;
    });
}