var Q = require('q');
var consul = require('consul')();

module.exports = {
    nodes: listNodes,
    services: listServices,
    serviceNodes: listServiceNodes
};

function listNodes() {
    var defer = Q.defer();

    consul.catalog.node.list(function(err, result) {
        if (err) return defer.reject(err);

        var res = [];

        result.forEach(function(item) {
            res.push({id: item.Node, address: item.Address});
        });

        defer.resolve(res);
    });

    return defer.promise;
}

function listServices() {
    var defer = Q.defer();

    consul.catalog.service.list(function(err, result) {
        if (err) return defer.reject(err);

        defer.resolve(result);
    });

    return defer.promise;
}

function listServiceNodes(service, tag) {
    var defer = Q.defer();

    var options = {
        service: service
    };

    if (tag) options.tag = tag;

    consul.catalog.service.nodes(options, function(err, result) {
        if (err) return defer.reject(err);

        defer.resolve(result);
    });

    return defer.promise;
}