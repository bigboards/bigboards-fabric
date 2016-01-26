var Q = require('q');
var consul = require('consul')();

module.exports = {
    register: registerService,
    deregister: deregisterService
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
