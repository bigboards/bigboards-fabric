var Q = require('q'),
    kv = require('../store/kv'),
    catalog = require('../store/catalog'),
    health = require('../store/health'),
    log4js = require('log4js');

var logger = log4js.getLogger('service.status');

module.exports = {
    status: getStatus
};

function getStatus() {
    logger.debug('Fetching the cluster status');

    return Q.all([_getNodeStatus(), _getTintStatus()]).then(function(results) {
        return {
            tints: results[1],
            nodes: results[0].nodes,
            containers: results[0].containers
        }
    });
}

function _getNodeStatus() {
    logger.debug('Reading the status of the nodes ');

    return kv.get.prefix('nodes').then(function(values) {
        var regex = new RegExp('nodes\/(.*)/containers\/(.*)');
        var result = {
            nodes: {},
            containers: {}
        };

        values.forEach(function(value) {
            if (! regex.test(value.Key)) return;

            var parts = regex.exec(value.Key);
            var container = parts[2];
            var node = parts[1];

            if (! result.nodes[node]) result.nodes[node] = { containers: {}, stats: { total: 0, 0: 0, 1: 0, 2: 0, 999: 0} };
            result.nodes[parts[1]].containers[container] = value.Flags;
            result.nodes[node].stats[value.Flags] = result.nodes[node].stats[value.Flags] + 1;
            result.nodes[node].stats.total += 1;

            if (! result.containers[container]) result.containers[container] = { nodes: {}, stats: { total: 0, 0: 0, 1: 0, 2: 0, 999: 0} };
            result.containers[container].nodes[node] = value.Flags;
            result.containers[container].stats[value.Flags] = result.containers[container].stats[value.Flags] + 1;
            result.containers[container].stats.total += 1;
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