var kv = require('../../store/kv'),
    Q = require('q'),
    consul = require('consul')(),
    EventEmitter = require('events'),
    util = require('util'),
    strUtils = require('../../utils/string-utils'),
    log4js = require('log4js');

var logger = log4js.getLogger('storage');

var flags = {
    OPERATION_PENDING: 1,
    OPERATION_OK: 2,
    OPERATION_FAILED: 4,
    CREATE: 8,
    UPDATE: 16,
    REMOVE: 32,
    CLEANUP: 64,
    START: 128,
    STOP: 256
};
ScopedStorage.flags = flags;

function ScopedStorage(prefix) {
    EventEmitter.call(this);

    this.prefix = strUtils.endsWith(prefix, '/') ? prefix.substring(0, prefix.length - 2) : prefix;
}

ScopedStorage.prototype.isListening = function() {
    return this.watch !== null;
};

ScopedStorage.prototype.startListening = function() {
    var me = this;

    // -- start listening on the prefix
    this.watch = consul.watch({ method: consul.kv.get, options: { key: prefix, recurse: true }});

    this.watch.on('change', function(data, res) {
        if (data) {
            logger.debug('received a batch of ' + data.length + ' changes');

            data.forEach(function(dataItem) {
                dataItem.Value = JSON.parse(dataItem.Value);

                var outcome = me.parseFlag(dataItem.Flags);

                if (outcome.operation && outcome.state) {
                    logger.debug('received a ' + outcome.operation + '.' + outcome.state + ' change');
                    me.emit(outcome.operation + '.' + outcome.state, dataItem);
                } else {
                    if (outcome.operation == null) logger.warn('INTERNAL - No operation was defined on the event with flag ' + dataItem.Flags);
                    if (outcome.state == null) logger.warn('INTERNAL - No state was defined on the event with flag ' + dataItem.Flags);
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

util.inherits(ScopedStorage, EventEmitter);

ScopedStorage.prototype.parseFlag = function parse(flag) {
    var operation = null;
    if (flag & flags.CREATE) operation = flagToName(flags.CREATE);
    else if (flag & flags.UPDATE) operation = flagToName(flags.UPDATE);
    else if (flag & flags.REMOVE) operation = flagToName(flags.REMOVE);
    else if (flag & flags.CLEANUP) operation = flagToName(flags.CLEANUP);
    else if (flag & flags.START) operation = flagToName(flags.START);
    else if (flag & flags.STOP) operation = flagToName(flags.STOP);

    var state = null;
    if (flag & flags.OPERATION_PENDING) state = flagToName(flags.OPERATION_PENDING);
    else if (flag & flags.OPERATION_OK) state = flagToName(flags.OPERATION_OK);
    else if (flag & flags.OPERATION_FAILED) state = flagToName(flags.OPERATION_FAILED);

    return { operation: operation, state: state };
};

ScopedStorage.prototype.internalKey = function (key, askForDir) {
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

ScopedStorage.prototype.signal = function(key, signal) {
    // -- for this operation, we must be listening
    if (! this.isListening()) this.startListening();

    var me = this;
    var defer = Q.defer();

    consul.kv.get(key, function(err, data) {
        if (err) return defer.reject(err);
        if (!data) return defer.reject(new Error('No data found at ' + key));

        var options = {
            key: key,
            value: data.Value,
            flags: signal + flags.OPERATION_PENDING
        };

        consul.kv.set(options, function(err, data) {
            if (err) return defer.reject(err);

            waitForResponseHandler(me, key, signal, 3600 * 1000, function(data) {
                defer.resolve(data.Value);
            }, function(error) {
                defer.reject(error);
            });
        });
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
                result.push(childKey.substring(me.prefix.length + 1));
            });
        }

        defer.resolve(result);
    });

    return defer.promise;
};

ScopedStorage.prototype.create = function(key, value, acquire) {
    // -- for this operation, we must be listening
    if (! this.isListening()) this.startListening();

    var defer = Q.defer();

    var actualKey = this.internalKey(key, false);
    var me = this;

    var options = {
        key: actualKey,
        value: JSON.stringify(value, null, 2),
        flags: kv.flags.CREATE + kv.flags.OPERATION_PENDING
    };

    if (acquire) options.acquire = acquire;

    consul.kv.set(options, function(err, success) {
        if (err) return defer.reject(err);

        logger.debug("set the flag of key " + options.key + ' to create.pending, waiting for confirmation');

        waitForResponseHandler(me, actualKey, kv.flags.CREATE, 3600 * 1000, function(data) {
            logger.debug("ok confirmation received for " + options.key);
            defer.resolve(data.Value);
        }, function(error) {
            logger.debug("error confirmation received for " + options.key);
            defer.reject(error);
        });
    });

    return defer.promise;
};

ScopedStorage.prototype.update = function(key, updateHandler) {
    // -- for this operation, we must be listening
    if (! this.isListening()) this.startListening();

    var defer = Q.defer();

    var me = this;
    var actualKey = this.internalKey(key, false);

    consul.kv.get(actualKey, function(err, data) {
        if (err) return defer.reject(err);
        if (!data) return defer.reject(new Error('No data found at ' + key));

        var obj = JSON.parse(data.Value);
        var res = updateHandler(obj);

        var options = {
            key: actualKey,
            value: res ? JSON.stringify(res, null, 2) : '',
            flags: kv.flags.UPDATE + kv.flags.OPERATION_PENDING
        };

        consul.kv.set(options,function(err, data) {
            if (err) return defer.reject(err);

            waitForResponseHandler(me, actualKey, kv.flags.UPDATE, 3600 * 1000, function(data) {
                defer.resolve(data.Value);
            }, function(error) {
                defer.reject(error);
            });
        });
    });

    return defer.promise;
};

ScopedStorage.prototype.remove = function(key) {
    // -- for this operation, we must be listening
    if (! this.isListening()) this.startListening();

    var defer = Q.defer();

    var me = this;
    var actualKey = this.internalKey(key, false);

    consul.kv.get(key, function(err, data) {
        if (err) return defer.reject(err);

        var options = {
            key: actualKey,
            value: data ? data.Value : null,
            flags: kv.flags.REMOVE + kv.flags.OPERATION_PENDING
        };

        consul.kv.set(options, function(err, data) {
            if (err) return defer.reject(err);

            waitForResponseHandler(me, actualKey, kv.flags.REMOVE, 3600 * 1000, function(data) {
                consul.kv.del({ key: actualKey, recurse: true}, function(err, data) {
                    return (err) ? defer.reject(err) : defer.resolve(data);
                });
            }, function(error) {
                defer.reject(error);
            });
        });
    });

    return defer.promise;
};

ScopedStorage.prototype.handle = function(event, fn) {
    this.on(flagToName(event) + '.' + flagToName(flags.OPERATION_PENDING), function(data) {
        logger.debug('received the ' + flagToName(event) + '.pending event we were looking for');

        // -- call the fn
        var promise = fn();

        if (promise) {
            promise.then(function(outcome) {
                if (data.Value && data.Value.error) delete data.Value.error;

                var options = {
                    key: data.Key,
                    value: JSON.stringify(data.Value),
                    flags: event + kv.flags.OPERATION_OK
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
                    flags: event + kv.flags.OPERATION_FAILED
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
                flags: event + kv.flags.OPERATION_OK
            };

            logger.debug("flagging the outcome as OK");

            consul.kv.set(options, function(err) {
                if (err) logger.error(err);
            });
        }
    });
};

module.exports = ScopedStorage;

function flagToName(flag) {
    switch(flag) {
        case flags.OPERATION_PENDING: return 'pending';
        case flags.OPERATION_OK: return 'ok';
        case flags.OPERATION_FAILED: return 'failed';
        case flags.CREATE: return 'create';
        case flags.UPDATE: return 'update';
        case flags.REMOVE: return 'remove';
        case flags.CLEANUP: return 'cleanup';
        case flags.START: return 'start';
        case flags.STOP: return 'stop';
    }
}

function waitForResponseHandler(emitter, key, operation, timeout, okFn, failFn) {
    var responded = false;

    var okHandler = function(data) {
        logger.debug("received an OK " + flagToName(operation) + " event for " + key + ": " + JSON.stringify(data));

        // -- ignore the event if we have already timed out
        if (responded) return;
        else responded = true;

        // -- ignore the event if the kv key does not match with the key we expect
        if (data.Key != key) return;

        emitter.removeListener(flagToName(operation) + '.ok', okHandler);
        emitter.removeListener(flagToName(operation) + '.failed', failedHandler);

        okFn(data);
    };

    var failedHandler = function(data) {
        logger.debug("received a FAILED " + flagToName(operation) + " event for " + key + ": " + JSON.stringify(data));

        // -- ignore the event if we have already timed out
        if (responded) return;
        else responded = true;

        // -- ignore the event if the kv key does not match with the key we expect
        if (data.Key != key) return;

        emitter.removeListener(flagToName(operation) + '.ok', okHandler);
        emitter.removeListener(flagToName(operation) + '.failed', failedHandler);

        failFn(new Error(data.Value.error));
    };

    emitter.on(flagToName(operation) + '.ok', okHandler);
    emitter.on(flagToName(operation) + '.failed', failedHandler);

    setTimeout(function () {
        if (responded) return;
        else responded = true;

        logger.error("Timeout Reached waiting for a " + flagToName(operation) + " result");

        emitter.removeListener(flagToName(operation) + '.ok', okHandler);
        emitter.removeListener(flagToName(operation) + '.failed', failedHandler);

        failFn(new Error('Timeout reached'));
    }, timeout);
}