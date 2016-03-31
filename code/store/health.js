var Q = require('q');
var consul = require('consul')();

module.exports = {
    node: getNodeHealth,
    service: getServiceHealth
};

function getNodeHealth(nodeId) {
    var defer = Q.defer();

    consul.health.node(nodeId, function(err, result) {
        if (err) return defer.reject(err);

        var res = [];

        result.forEach(function(item) {
            var i = {
                checkId: item.CheckID,
                name: item.Name,
                status: item.Status,
                notes: item.Notes,
                output: item.Output
            };

            if (item.ServiceID && item.ServiceID != '') {
                i.service = {
                    id: item.ServiceID,
                    name: item.ServiceName
                };
            }

            res.push(i);
        });

        defer.resolve(res);
    });

    return defer.promise;
}

function getServiceHealth(service, tag) {
    var defer = Q.defer();

    var opts = {
        service: service
    };

    if (tag) opts.tag = tag;

    consul.health.service(opts, function(err, result) {
        if (err) return defer.reject(err);

        var res = {
            service: service,
            nodes: {}
        };

        result.forEach(function(nodeServiceStatus) {
            var node = nodeServiceStatus.Node.Node;

            nodeServiceStatus.Checks.forEach(function(item) {
                res.nodes[node] = {
                    checkId: item.CheckID,
                    name: item.Name,
                    status: item.Status,
                    notes: item.Notes,
                    output: item.Output
                };
            })
        });

        defer.resolve(res);
    });

    return defer.promise;
}