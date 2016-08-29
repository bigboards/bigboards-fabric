var Q = require('q'),
    fs = require('../utils/fs-utils'),
    log4js = require('log4js');

var logger = log4js.getLogger('consul.kv');
var consul = require('consul')();

module.exports = {
    generate: generateValue,
    exists: exists,
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
    children: listChildren,
    on: onFlagChange,
    listen: listenFlagChange,
    flag: setFlag,
    multiflag: setFlagForAll,
    raw: {
        set: setRawValue,
        get: getRawValue
    }
};

function exists(key) {
    var defer = Q.defer();

    consul.kv.get(key, function(err, data) {
        if (err) return defer.resolve(false);
        if (! data) return defer.resolve(true);
    });

    return defer.promise;
}

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

        logger.debug(data.Value);
        return defer.resolve(JSON.parse(data.Value));
    });

    return defer.promise;
}

function getValuesByPrefix(prefix) {
    var defer = Q.defer();

    consul.kv.get({key: prefix, recurse: true}, function(err, result) {
        if (err) return defer.reject(err);

        return defer.resolve(result);
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

        // -- Test to validate the value that is written to consul
        if (options.value && options.value.indexOf("Value") != -1)
            logger.error("[KV.SetFlag] Invalid Value written");

        consul.kv.set(options, function(err, data) {
            return (err) ? defer.reject(err) : defer.resolve(data);
        });
    });

    return defer.promise;
}

function setFlagForAll(key, flag, filter) {
    var promises = [];

    consul.kv.keys(key, function(err, data) {
        if (err) return promises.push(Q.reject(err));

        data.forEach(function(subKey) {
            if (filter && !filter(subKey)) {
                logger.debug('skipping ' + subKey);
                return;
            }

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

    // -- Test to validate the value that is written to consul
    if (options.value && options.value.indexOf("Value") != -1)
        logger.error("[KV.SetValue] Invalid Value written");

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

function updateValue(key, flag, updateHandler) {
    var defer = Q.defer();

    consul.kv.get(key, function(err, data) {
        if (err) return defer.reject(err);
        if (!data) return defer.reject(new Error('No data found at ' + key));

        var obj = JSON.parse(data.Value);
        var res = updateHandler(obj);

        var options = {
            Key: key,
            value: JSON.stringify(res, null, 2),
            Flags: flag
        };

        // -- Test to validate the value that is written to consul
        if (options.value && options.value.indexOf("Value") != -1)
            logger.error("[KV.Update] Invalid Value written: " + new Error().stack);

        consul.kv.set(options, function(err, data) {
            if (err) return defer.reject(err);

            defer.resolve();
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

function listChildren(prefix) {
    var defer = Q.defer();

    if (prefix.lastIndexOf("/") != prefix.length -1) prefix = prefix + '/';

    consul.kv.keys({key: prefix, separator: '/'}, function(err, data) {
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

function listenFlagChange(key, listener, recurse, operations, regex) {
    var watch = consul.watch({ method: consul.kv.get, options: { key: key, recurse: recurse, separator: "/" }});

    watch.on('change', function(data, res) {
        if (data) {
            data.forEach(function(dataItem) {
                var goAhead = true;

                if (regex && !dataItem.Key.match(regex)) {
                    goAhead = false;
                }

                if (operations) {
                    for (var idx in operations) {
                        if (!operations.hasOwnProperty(idx)) continue;

                        if (! (dataItem.Flags & operations[idx])) {
                            goAhead = false;
                            break;
                        }
                    }
                }

                if (goAhead) {
                    logger.debug('calling listener with flag ' + dataItem.Flags);

                    listener(null, dataItem);
                }
            });
        }
    });

    watch.on('error', function(error) {
        listener(error);
    });

    return watch;
}

function onFlagChange(key, timeout) {
    var defer = Q.defer();

    if (! timeout) timeout = 60 * 60 * 1000;
    var timedOut = false;


    var watch = consul.watch({ method: consul.kv.get, options: { key: key }});

    watch.on('change', function(data, res) {
        if (timedOut) return;

        if (data) {
            // -- stop  watching
            watch.end();

            data.forEach(function(dataItem) {
                // -- we will ignore pending changes
                if (dataItem.Flags % flags.OPERATION_PENDING || dataItem.Flags % flags.OPERATION_NEW) return;

                var value = JSON.parse(dataItem.Value);
                if (dataItem.Flags % flags.OPERATION_FAILED) {
                    defer.reject(new Error(value.error));
                } else if (dataItem.Flags % flags.OPERATION_OK) {
                    defer.resolve(dataItem);
                } else {
                    defer.reject(new Error("Invalid key/value item flags"));
                }
            })
        }
    });

    watch.on('error', function(error) {
        if (timedOut) return;

        // -- stop  watching
        watch.end();

        defer.reject(error);
    });

    setTimeout(function () {
        if (timedOut) return;

        watch.end();
        timedOut = true;
        defer.reject(new Error('Timeout reached'));
    }, timeout);

    return defer.promise;
}