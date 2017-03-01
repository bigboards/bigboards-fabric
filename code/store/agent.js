var Q = require('q');
var consul = require('consul')();

module.exports = {
    identity: identity
};

function identity() {
    var defer = Q.defer();

    consul.agent.self(function(err, result) {
        if (err) return defer.reject(err);

        defer.resolve(result);
    });

    return defer.promise;
}