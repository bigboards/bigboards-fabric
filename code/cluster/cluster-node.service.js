var Q = require('q'),
    kv = require('../store/kv'),
    catalog = require('../store/catalog'),
    health = require('../store/health'),
    log4js = require('log4js');

var logger = log4js.getLogger('service.node');

var CheckStates = ['passing', 'warning', 'critical', 'unknown'];

module.exports = {
    list: listNodes,
    get: getNode
};

function listNodes() {
    return catalog.nodes().then(function(nodes) {
        logger.debug('discovered the following nodes: ' + JSON.stringify(nodes));

        var promises = [];

        nodes.forEach(function(nodeItem) {
            promises.push(_getNodeListItem(nodeItem.id));
        });

        return Q.all(promises);
    });
}

function getNode(nodeId) {
    return _getExtendedNodeDetail(nodeId);
}

function _getNodeListItem(nodeId) {
    return _getExtendedNodeDetail(nodeId).then(function(node) {
        if (! node.health) node.health = 'unknown';
        else {
            var worstStatusLevel = 0;
            node.health.forEach(function(check) {
                var severityLevel = CheckStates.indexOf(check.status);

                if (severityLevel > worstStatusLevel) worstStatusLevel = severityLevel;
            });

            node.health = CheckStates[worstStatusLevel];
        }

        node.cores = 0;
        if (node.cpus) {
            node.cores = node.cpus.length;
            delete node.cpus;
        }

        node.storage = 0;
        if (node.disks) {
            node.disks.forEach(function (disk) {
                node.storage += disk.size;
            });
            delete node.disks;
        }

        return node;
    });
}

function _getExtendedNodeDetail(nodeId) {
    return Q.all([
        kv.get.key('nodes/' + nodeId),
        health.node(nodeId)
    ]).then(function(results) {
        var result = results[0];

        result.health = results[1];

        return result;
    });
}