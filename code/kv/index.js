var Q = require('q');
var consul = require('consul')();

module.exports = {
    get: getValue,
    set: setValue,
    update: updateValue,
    remove: removeValue,
    list: listKeys
};

function getValue(key) {
    var defer = Q.defer();

    consul.kv.get(key, function(err, data) {
        if (err) return defer.reject(err);

        return defer.resolve(JSON.parse(data.Value));
    });

    return defer.promise;
}

function setValue(key, value) {
    var defer = Q.defer();

    consul.kv.set(key, value, function(err, data) {
        if (err) return defer.reject(err);

        return defer.resolve(JSON.parse(data.Value));
    });

    return defer.promise;
}

function updateValue(key, updateHandler) {
    var defer = Q.defer();

    consul.kv.get(key, function(err, data) {
        if (err) return defer.reject(err);
        if (!data) return defer.reject(new Error('No data found at ' + key));

        var obj = JSON.parse(data.Value);
        var res = updateHandler(obj);

        consul.kv.set(res, JSON.stringify(res, null, 2), function(err, data) {
            if (err) return defer.reject(err);

            defer.resolve(JSON.parse(data.Value));
        });
    });

    return defer.promise;
}

function removeValue(key) {
    var defer = Q.defer();

    consul.kv.del(key, function(err, data) {
        return (err) ? defer.reject(err) : defer.resolve(data);
    });

    return defer.promise;
}

function listKeys(prefix) {
    var defer = Q.defer();

    consul.kv.keys(prefix, function(err, data) {
        return (err) ? defer.reject(err) : defer.resolve(data);
    });

    return defer.promise;
}