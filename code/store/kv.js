var Q = require('q'),
    fs = require('../utils/fs-utils'),
    log4js = require('log4js');

var logger = log4js.getLogger('consul.kv');
var consul = require('consul')();

module.exports = {
    generate: generateValue,
    get: {
        key: getValue,
        prefix: getValuesByPrefix
    },
    set: setValue,
    update: updateValue,
    remove: {
        key: removeByKey,
        prefix: removeByPrefix
    },
    list: listKeys,
    watch: watchKey,
    flag: setFlag,
    multiflag: setFlagForAll,
    raw: {
        set: setRawValue,
        get: getRawValue
    }
};

function generateValue(consulPath, fsPath, variables, prefix) {
    var defer = Q.defer();

    logger.info('Generating consul:' + consulPath + ' to ' + fsPath);

    consul.kv.get({key: consulPath, recurse: true}, function(err, result) {
        if (err) {
            logger.debug('Unable to get template "' + consulPath + '" from the consul state store: ' + err);
            return defer.reject(err);
        }

        if (!result) {
            logger.debug('Unable to get template "' + consulPath + '" from the consul state store: Not Found!');
            return defer.reject('Not Found!');
        }

        result.forEach(function(template) {
            var filePath = template.Key;
            if (prefix) {
                filePath = filePath.substr(prefix.length + 1);
            }

            logger.debug('Generating consul:' + template.Key + ' to ' + fsPath + '/' + filePath);
            fs.generateString(template.Value, fsPath + '/' + filePath, variables);
        });

        defer.resolve();
    });

    return defer.promise;
}

function getValue(key) {
    var defer = Q.defer();

    consul.kv.get(key, function(err, data) {
        if (err) return defer.reject(err);
        if (! data) return defer.resolve({});

        return defer.resolve(JSON.parse(data.Value));
    });

    return defer.promise;
}

function getValuesByPrefix(prefix) {
    var defer = Q.defer();

    consul.kv.get({key: prefix, recurse: true}, function(err, result) {
        if (err) return defer.reject(err);

        return result;
    });

    return defer.promise;
}

function getRawValue(key) {
    var defer = Q.defer();

    consul.kv.get(key, function(err, data) {
        if (err) return defer.reject(err);

        return defer.resolve(data.Value);
    });

    return defer.promise;
}

function setFlag(key, flag) {
    var defer = Q.defer();

    consul.kv.get(key, function(err, data) {
        if (err) return defer.reject(err);
        if (!data) return defer.reject(new Error('No data found at ' + key));

        var options = {
            key: key,
            value: data.Value,
            flags: flag
        };

        consul.kv.set(options, function(err, data) {
            return (err) ? defer.reject(err) : defer.resolve(data);
        });
    });

    return defer.promise;
}

function setFlagForAll(key, flag) {
    var promises = [];

    consul.kv.keys(key, function(err, data) {
        if (err) return promises.push(Q.reject(err));

        data.forEach(function(subKey) {
            logger.debug('Flagging consul:' + subKey + ' to ' + flag);
            promises.push(setFlag(subKey, flag));
        });
    });

    return Q.all(promises);
}

function setValue(key, value, acquire, flags) {
    var defer = Q.defer();

    var options = {
        key: key,
        value: JSON.stringify(value, null, 2)
    };

    if (acquire) options.acquire = acquire;
    if (flags) options.flags = flags;

    consul.kv.set(options, function(err, success) {
        if (err) return defer.reject(err);

        return defer.resolve(success);
    });

    return defer.promise;
}

function setRawValue(key, value, acquire, flags) {
    var defer = Q.defer();

    var options = {
        key: key,
        value: value
    };

    if (acquire) options.acquire = acquire;
    if (flags) options.flags = flags;

    consul.kv.set(options, function(err, success) {
        if (err) return defer.reject(err);

        return defer.resolve(success);
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

        consul.kv.set(key, JSON.stringify(res, null, 2), function(err, data) {
            if (err) return defer.reject(err);

            defer.resolve(JSON.parse(data.Value));
        });
    });

    return defer.promise;
}

function removeByKey(key) {
    var defer = Q.defer();

    consul.kv.del(key, function(err, data) {
        return (err) ? defer.reject(err) : defer.resolve(data);
    });

    return defer.promise;
}

function removeByPrefix(prefix) {
    var defer = Q.defer();

    consul.kv.del({ key: prefix, recurse: true}, function(err, data) {
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

function watchPrefix(prefix) {
    return consul.watch({ method: consul.kv.get, options: { keyprefix: prefix }});
}

function watchKey(key) {
    return consul.watch({ method: consul.kv.get, options: { key: key }});
}