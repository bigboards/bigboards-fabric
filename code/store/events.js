var Q = require('q');
var consul = require('consul')();

module.exports = {
    fire: fire,
    list: list
};

function fire(name, payload) {
    var defer = Q.defer();

    consul.event.fire(name, JSON.stringify(payload), function(err, result) {
        if (err) return defer.reject(err);

        defer.resolve(result);
    });

    return defer.promise;
}

function list(name) {
    var defer = Q.defer();

    consul.event.list(name, function(err, results) {
        if (err) return defer.reject(err);

        var res = [];

        results.forEach(function(result) {
            res.push({
                id: result.ID,
                event: result.Name,
                sequence: result.LTime,
                data: JSON.parse(result.Payload)
            })
        });

        defer.resolve(res);
    });

    return defer.promise;
}