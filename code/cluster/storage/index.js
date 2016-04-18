var kv = require('../../store/kv'),
    Q = require('q'),
    consul = require('consul')({promisify: true}),
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

    this.prefix = strUtils.endsWith(prefix, '/') ? prefix.substring(0, prefix.length - 2) : prefix;
}

util.inherits(ScopedStorage, EventEmitter);

ScopedStorage.prototype.isListening = function() {
    return this.watch !== null;
};

ScopedStorage.prototype.startListening = function() {
    var me = this;

    // -- start listening on the prefix
    this.watch = consul.watch({ method: consul.kv.get, options: { key: this.prefix, recurse: true }});

    this.watch.on('change', function(data, res) {
        if (data) {
            logger.debug('received a batch of ' + data.length + ' changes');

            data.forEach(function(dataItem) {
                /*if (dataItem.Key != me.prefix) {
                    logger.debug('skipping modify of ' + dataItem.Key + ' since it does not match ' + me.prefix);
                    return;
                }*/

                dataItem.Value = JSON.parse(dataItem.Value);

                var outcome = consulUtils.parseFlag(dataItem.Flags);

                if (outcome.operation && outcome.state) {
                    logger.debug('received a ' + outcome.operation + '.' + outcome.state + ' change');
                    me.emit(outcome.operation + '.' + outcome.state, dataItem);
                } else {
                    if (outcome.operation == null) logger.warn('[' + dataItem.Key + '] INTERNAL - No operation was defined on the event with flag ' + dataItem.Flags);
                    if (outcome.state == null) logger.warn('[' + dataItem.Key + '] INTERNAL - No state was defined on the event with flag ' + dataItem.Flags);
                }
            })
        }
    });

    this.watch.on('error', function(error) {
        logger.warn(error);
    });
};

ScopedStorage.prototype.stopListening = function() {
    this.watch.end();
};

ScopedStorage.prototype.internalKey = function (key, askForDir) {
    if (! key) return this.prefix + (askForDir ? '/' : '');

    if (strUtils.startsWith(key, '/')) key = strUtils.stripFirst(key);
    if (strUtils.endsWith(key, '/')) key = strUtils.stripLast(key);

    return this.prefix + '/' + key + (askForDir ? '/' : '');
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
    logger.debug('[ SIGNAL ] operation=get, key=' + key);
    return consul.kv.get(key, function(err, data) {
        if (err) return Q.reject(err);
        if (!data) return Q.reject(new Error('No data found at ' + key));

        var options = {
            key: key,
            value: data.Value,
            flags: signal + consulUtils.flags.OPERATION_PENDING
        };

        logger.debug('[ SIGNAL ] operation=set, key=' + options.key + ', flags=' + options.flags);
        return consul.kv.set(options, function(err, data) {
            if (err) return Q.reject(err);

            return watchAndWait(options.key, signal, timeouts.update);
        });
    });
};

ScopedStorage.prototype.create = function(key, value, acquire) {
    var actualKey = this.internalKey(key, false);

    var options = {
        key: actualKey,
        value: JSON.stringify(value, null, 2),
        flags: consulUtils.flags.CREATE + consulUtils.flags.OPERATION_PENDING
    };

    if (acquire) options.acquire = acquire;

    logger.debug('[ CREATE ] operation=set, key=' + options.key + ', flags=' + options.flags);
    return consul.kv.set(options)
        .then(function(success) {
            logger.debug("set the flag of key " + options.key + ' to create.pending, waiting for confirmation');

            return watchAndWait(options.key, consulUtils.flags.CREATE, timeouts.create)
                .then(function() {
                    logger.debug("ok confirmation received for " + options.key);
                }, function(error) {
                    logger.debug("error confirmation received for " + options.key + ": " + error.message);
                });
        });
};

ScopedStorage.prototype.update = function(key, updateHandler) {
    var actualKey = this.internalKey(key, false);

    logger.debug('[ UPDATE ] operation=get, key=' + actualKey);
    return consul.kv.get(actualKey)
        .then(function(data) {
            if (!data) return Q.reject(new Error('No data found at ' + key));

            var obj = JSON.parse(data.Value);
            var res = updateHandler(obj);

            var options = {
                key: actualKey,
                value: res ? JSON.stringify(res, null, 2) : '',
                flags: consulUtils.flags.UPDATE + consulUtils.flags.OPERATION_PENDING
            };

            logger.debug('[ UPDATE ] operation=set, key=' + options.key + ', flags=' + options.flags);
            return consul.kv.set(options,function(err, data) {
                if (err) return Q.reject(err);

                return watchAndWait(operation.key, consulUtils.flags.UPDATE, timeouts.update);
            });
        });
};

ScopedStorage.prototype.remove = function(key) {
    var actualKey = this.internalKey(key, false);

    logger.debug('[ REMOVE ] operation=get, key=' + actualKey);
    return consul.kv.get(key)
        .then(function(data) {
            var options = {
                key: actualKey,
                value: data ? data.Value : null,
                flags: consulUtils.flags.REMOVE + consulUtils.flags.OPERATION_PENDING
            };

            logger.debug('[ REMOVE ] operation=set, key=' + options.key + ', flags=' + options.flags);
            return consul.kv.set(options, function(err, data) {
                if (err) return Q.reject(err);

                return watchAndWait(options.key, consulUtils.flags.REMOVE, timeouts.remove)
                    .then(function() {
                        return consul.kv.del({ key: actualKey, recurse: true });
                    });
            });
        });
};

ScopedStorage.prototype.handle = function(event, fn) {
    this.on(consulUtils.flagToName(event) + '.' + consulUtils.flagToName(consulUtils.flags.OPERATION_PENDING), function(data) {
        logger.debug('received the ' + consulUtils.flagToName(event) + '.pending event we were looking for');

        // -- call the fn
        var promise = fn();

        if (promise) {
            promise.then(function(outcome) {
                if (data.Value && data.Value.error) delete data.Value.error;

                var options = {
                    key: data.Key,
                    value: JSON.stringify(data.Value),
                    flags: event + consulUtils.flags.OPERATION_OK
                };

                logger.debug("flagging the outcome as OK");

                consul.kv.set(options, function(err) {
                    if (err) logger.error(err);
                });
            }, function(error) {
                if (!data.Value) data.Value = {};
                data.Value.error = error;

                var options = {
                    key: data.Key,
                    value: JSON.stringify(data.Value),
                    flags: event + consulUtils.flags.OPERATION_FAILED
                };

                logger.debug("flagging the outcome as FAILED");

                consul.kv.set(options, function(err) {
                    if (err) logger.error(err);
                });
            })
        } else {
            if (data.Value && data.Value.error) delete data.Value.error;

            var options = {
                key: data.Key,
                value: JSON.stringify(data.Value),
                flags: event + consulUtils.flags.OPERATION_OK
            };

            logger.debug("flagging the outcome as OK");

            consul.kv.set(options, function(err) {
                if (err) logger.error(err);
            });
        }
    });
};

module.exports = ScopedStorage;

function watchAndWait(key, operation, timeout) {
    var defer = Q.defer();
    var responded = false;

    var watch = consul.watch({ method: consul.kv.get, options: { key: key }});
    watch.on('change', function(dataItem) {
        if (responded) return;

        logger.trace(JSON.stringify(dataItem));

        dataItem.Value = JSON.parse(dataItem.Value);

        var outcome = consulUtils.parseFlag(dataItem.Flags);

        if (outcome.operation != operation) {
            defer.reject(new Error('Multiple changes to the same key! Expected operation ' + consulUtils.flagToName(operation) + ' but received operation ' + consulUtils.flagToName(outcome.operation)));
            responded = true;
            watch.end();
        } else {
            defer.resolve(dataItem);
            responded = true;
            watch.end();
        }
    });

    watch.on('error', function(error) {
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