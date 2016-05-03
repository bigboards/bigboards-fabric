var kv = require('../../store/kv'),
    Q = require('q'),
    consul = require('consul')(),
    EventEmitter = require('events'),
    util = require('util'),
    strUtils = require('../../utils/string-utils'),
    consulUtils = require('../../utils/consul-utils'),
    settings = require('../../settings'),
    log4js = require('log4js');

var logger = log4js.getLogger('storage');

var timeouts = {
    create: settings.get('timeout.create', 3600 * 1000),
    update: settings.get('timeout.update', 10 * 1000),
    remove: settings.get('timeout.remove', 10 * 1000)
};

function ScopedStorage(prefix) {
    EventEmitter.call(this);

    if (! prefix) this.prefix = "";
    else this.prefix = strUtils.endsWith(prefix, '/') ? prefix.substring(0, prefix.length - 2) : prefix;
}

util.inherits(ScopedStorage, EventEmitter);

ScopedStorage.prototype.internalKey = function (key, askForDir) {
    if (! key) return this.prefix + (askForDir ? '/' : '');

    if (strUtils.startsWith(key, '/')) key = strUtils.stripFirst(key);
    if (strUtils.endsWith(key, '/')) key = strUtils.stripLast(key);

    if (this.prefix.length > 0) return this.prefix + '/' + key + (askForDir ? '/' : '');
    else return key + (askForDir ? '/' : '');
};

ScopedStorage.prototype.get = function(key) {
    var defer = Q.defer();

    var actualKey = this.internalKey(key, false);

    consul.kv.get(actualKey, function(err, data) {
        if (err) return defer.reject(err);
        if (! data) return defer.resolve({});

        return defer.resolve(JSON.parse(data.Value));
    });

    return defer.promise;
};

ScopedStorage.prototype.childKeys = function(key) {
    var defer = Q.defer();
    var me = this;

    var actualPrefix = this.internalKey(key, true);

    consul.kv.keys({key: actualPrefix, separator: '/'}, function(err, data) {
        if (err) defer.reject(err);

        var result = [];

        if (data) {
            data.forEach(function (childKey) {
                if (childKey.indexOf(me.prefix) === 0)
                    childKey = childKey.substring(me.prefix.length + 1);

                result.push(childKey);
            });
        }

        defer.resolve(result);
    });

    return defer.promise;
};

ScopedStorage.prototype.signal = function(key, signal) {
    var defer = Q.defer();
    var actualKey = this.internalKey(key, false);

    logger.debug('[ SIGNAL ] operation=get, key=' + actualKey);
    consul.kv.get(actualKey, function(err, data) {
        if (err) return defer.reject(err);
        if (!data) return defer.reject(new Error('No data found at ' + actualKey));

        var options = {
            key: actualKey,
            value: data.Value,
            flags: signal + consulUtils.flags.OPERATION_NEW
        };

        logger.debug('[ SIGNAL ] operation=set, key=' + options.key + ', flags=' + options.flags);

        // -- Test to validate the value that is written to consul
        if (options.value && options.value.indexOf("Value") != -1)
            logger.error("[Storage.Signal] Invalid Value written");

        consul.kv.set(options, function(err) {
            if (err) {
                logger.debug("[ SIGNAL ] FAILED for " + options.key + ": " + err.message);
                return defer.reject(err);
            }

            watchAndWait(options.key, signal, timeouts.update)
                .then(function() {
                    logger.debug("[ SIGNAL ] OK for " + options.key);
                    defer.resolve();
                }, function(error) {
                    logger.debug("[ SIGNAL ] FAILED for " + options.key + ": " + error.message);
                    defer.reject(error)
                });
        });
    });

    return defer.promise;
};

ScopedStorage.prototype.create = function(key, value, acquire) {
    var defer = Q.defer();
    var actualKey = this.internalKey(key, false);

    var options = {
        key: actualKey,
        value: JSON.stringify(value, null, 2),
        flags: consulUtils.flags.CREATE + consulUtils.flags.OPERATION_NEW
    };

    if (acquire) options.acquire = acquire;

    // -- Test to validate the value that is written to consul
    if (options.value && options.value.indexOf("Value") != -1)
        logger.error("[Storage.Create] Invalid Value written");

    logger.debug('[ CREATE ] operation=set, key=' + options.key + ', flags=' + options.flags + ', data=' + options.value);
    consul.kv.set(options, function(err) {
        if (err) {
            logger.debug("[ CREATE ] FAILED for " + options.key + ": " + err.message);
            return defer.reject(err);
        }

        watchAndWait(options.key, consulUtils.flags.CREATE, timeouts.create)
            .then(function() {
                logger.debug("[ CREATE ] OK for " + options.key);
                defer.resolve();
            }, function(error) {
                logger.debug("[ CREATE ] FAILED for " + options.key + ": " + error.message);
                defer.reject(error);
            });
    });

    return defer.promise;
};

ScopedStorage.prototype.update = function(key, updateHandler) {
    var defer = Q.defer();
    var actualKey = this.internalKey(key, false);

    logger.debug('[ UPDATE ] operation=get, key=' + actualKey);
    consul.kv.get(actualKey, function(err, data) {
        if (err) return defer.reject(err);
        if (!data) return defer.reject(new Error('No data found at ' + key));

        var obj = JSON.parse(data.Value);
        var res = updateHandler(obj);

        var options = {
            key: actualKey,
            value: res ? JSON.stringify(res, null, 2) : '',
            flags: consulUtils.flags.UPDATE + consulUtils.flags.OPERATION_NEW
        };

        // -- Test to validate the value that is written to consul
        if (options.value && options.value.indexOf("Value") != -1)
            logger.error("[Storage.Update] Invalid Value written");

        logger.debug('[ UPDATE ] operation=set, key=' + options.key + ', flags=' + options.flags + ', data=' + options.value);
        consul.kv.set(options, function(err) {
            if (err) {
                logger.debug("[ UPDATE ] FAILED for " + options.key + ": " + err.message);
                return defer.reject(err);
            }

            watchAndWait(options.key, consulUtils.flags.UPDATE, timeouts.update)
                .then(function() {
                    logger.debug("[ UPDATE ] OK for " + options.key);
                    defer.resolve();
                }, function(error) {
                    logger.debug("[ UPDATE ] FAILED for " + options.key + ": " + error.message);
                    defer.reject(error);
                });
        });
    });

    return defer.promise;
};

ScopedStorage.prototype.removeSync = function(key) {
    var defer = Q.defer();

    var actualKey = this.internalKey(key, false);

    logger.debug('[ REMOVE:SYNC ] operation=remove, key=' + actualKey);
    consul.kv.del({ key: actualKey, recurse: true }, function(err) {
        if (err) {
            logger.debug("[ REMOVE:SYNC ] FAILED for " + actualKey + ": " + err.message);
            defer.reject(err);
        } else {
            logger.debug("[ REMOVE:SYNC ] OK for " + actualKey);
            defer.resolve();
        }
    });

    return defer.promise;
};

ScopedStorage.prototype.remove = function(key) {
    var defer = Q.defer();
    var actualKey = this.internalKey(key, false);

    logger.debug('[ REMOVE ] operation=get, key=' + actualKey);
    consul.kv.get(key, function(err, data) {
        if (err) {
            logger.debug("[ REMOVE ] FAILED for " + options.key + ": " + err.message);
            return defer.reject(err);
        }

        var options = {
            key: actualKey,
            value: data ? data.Value : null,
            flags: consulUtils.flags.REMOVE + consulUtils.flags.OPERATION_NEW
        };

        // -- Test to validate the value that is written to consul
        if (options.value && options.value.indexOf("Value") != -1)
            logger.error("[Storage.Remove] Invalid Value written");

        logger.debug('[ REMOVE ] operation=set, key=' + options.key + ', flags=' + options.flags + ', data=' + options.value);
        consul.kv.set(options, function(err) {
            if (err) {
                logger.debug("[ REMOVE ] FAILED for " + options.key + ": " + err.message);
                return defer.reject(err);
            }
            watchAndWait(options.key, consulUtils.flags.REMOVE, timeouts.remove)
                .then(function() {
                    consul.kv.del({ key: actualKey, recurse: true }, function(err) {
                        if (err) {
                            logger.debug("[ REMOVE ] FAILED for " + options.key + ": " + err.message);
                            defer.reject(error);
                        } else {
                            logger.debug("[ REMOVE ] OK for " + options.key);
                            defer.resolve();
                        }
                    });
                });
        });
    });

    return defer.promise;
};

module.exports = ScopedStorage;

function watchAndWait(key, operation, timeout) {
    var defer = Q.defer();
    var responded = false;

    var watch = consul.watch({ method: consul.kv.get, options: { key: key }});
    watch.on('change', function(dataItem) {
        if (responded) return;

        dataItem.Value = JSON.parse(dataItem.Value);

        var outcome = consulUtils.parseFlag(dataItem.Flags);

        if (outcome.operation != operation) {
            defer.reject(new Error('Multiple changes to the same key! Expected operation ' + consulUtils.flagToName(operation) + ' but received operation ' + consulUtils.flagToName(outcome.operation)));
            responded = true;
            watch.end();
        } else if (outcome.state == consulUtils.flags.OPERATION_OK) {
            defer.resolve(dataItem);
            responded = true;
            watch.end();
        } else if (outcome.state == consulUtils.flags.OPERATION_FAILED) {
            defer.reject(new Error("Something went wrong during the " + consulUtils.flagToName(operation) + " operation. Check the node logfile for more details."));
            responded = true;
            watch.end();
        }
    });

    watch.on('error', function(error) {
        if (responded) return;

        defer.reject(error);
        responded = true;
        watch.end();
    });

    setTimeout(function () {
        if (responded) return;
        else responded = true;

        logger.error("Timeout Reached waiting for a change of " + key);

        defer.reject(new Error('Timeout reached'));
        watch.end();
    }, timeout);

    return defer.promise;
}