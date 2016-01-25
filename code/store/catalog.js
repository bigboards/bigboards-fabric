var Q = require('q');
var consul = require('consul')();

module.exports = {
    nodes: listNodes
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