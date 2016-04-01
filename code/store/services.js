var Q = require('q');
var consul = require('consul')();
var catalog = require('../store/catalog');

module.exports = {
    register: registerService,
    deregister: deregisterService,
    nodes: listNodesForService
};

function registerService(service) {
    var defer = Q.defer();

    consul.agent.service.register(service, function(err, result) {
        if (err) return defer.reject(err);

        defer.resolve(result);
    });

    return defer.promise;
}

function deregisterService(serviceId) {
    var defer = Q.defer();

    consul.agent.service.deregister(serviceId, function(err, result) {
        if (err) return defer.reject(err);

        defer.resolve(result);
    });

    return defer.promise;
}

function listNodesForService(serviceId) {
    return catalog.serviceNodes(serviceId).then(function(results) {
        var list = [];

        results.forEach(function(result) {
            list.push({name: result.Node, address: result.Address});
        });

        return list;
    })
}
