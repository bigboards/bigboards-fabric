var Q = require('q'),
    kv = require('../store/kv'),
    catalog = require('../store/catalog'),
    health = require('../store/health'),
    log4js = require('log4js');

var logger = log4js.getLogger('service.cluster.services');

module.exports = {
    list: listServices
};

function listServices() {
    return catalog.services().then(function (services) {
        var promises = [];

        for (var service in services) {
            if (! services.hasOwnProperty(service)) continue;
            if (service == 'consul') continue;

            promises.push(health.service(service))
        }

        return Q.all(promises).then(function(results) {
            var res = {};

            results.forEach(function(result) {
                res[result.service] = result.nodes;
            });

            return res;
        })
    });
}