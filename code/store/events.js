var Q = require('q');
var consul = require('consul')();

module.exports = {
    fire: fire,
    list: list,
    reply: reply,
    watch: registerWatchHandler,
    on: registerWatchOnce,
    state: {
        PENDING: 'pending',
        SUCCESS: 'success',
        FAILED: 'failed'
    },
    names: {
        TINT_INSTALL_PENDING: 'tint:install:pending',
        TINT_INSTALL_SUCCESS: 'tint:install:success',
        TINT_INSTALL_FAILED: 'tint:install:failed',

        TINT_UNINSTALL_PENDING: 'tint:uninstall:pending',
        TINT_UNINSTALL_SUCCESS: 'tint:uninstall:success',
        TINT_UNINSTALL_FAILED: 'tint:uninstall:failed',

        RESOURCE_LOAD_PENDING: 'resource:load:pending',
        RESOURCE_LOAD_SUCCESS: 'resource:load:success',
        RESOURCE_LOAD_FAILED: 'resource:load:failed',

        RESOURCE_INSTALL_PENDING: 'resource:install:pending',
        RESOURCE_INSTALL_SUCCESS: 'resource:install:success',
        RESOURCE_INSTALL_FAILED: 'resource:install:failed'
        ,
        RESOURCE_UNINSTALL_PENDING: 'resource:uninstall:pending',
        RESOURCE_UNINSTALL_SUCCESS: 'resource:uninstall:success',
        RESOURCE_UNINSTALL_FAILED: 'resource:uninstall:failed',

        RESOURCE_CLEANUP_PENDING: 'resource:cleanup:pending',
        RESOURCE_CLEANUP_SUCCESS: 'resource:cleanup:success',
        RESOURCE_CLEANUP_FAILED: 'resource:cleanup:failed',

        DAEMON_INSTALL_PENDING: 'daemon:install:pending',
        DAEMON_INSTALL_SUCCESS: 'daemon:install:success',
        DAEMON_INSTALL_FAILED: 'daemon:install:failed'
        ,
        DAEMON_UNINSTALL_PENDING: 'daemon:uninstall:pending',
        DAEMON_UNINSTALL_SUCCESS: 'daemon:uninstall:success',
        DAEMON_UNINSTALL_FAILED: 'daemon:uninstall:failed',

        DAEMON_CLEANUP_PENDING: 'daemon:cleanup:pending',
        DAEMON_CLEANUP_SUCCESS: 'daemon:cleanup:success',
        DAEMON_CLEANUP_FAILED: 'daemon:cleanup:failed',

        DAEMON_START_PENDING: 'daemon:start:pending',
        DAEMON_START_SUCCESS: 'daemon:start:success',
        DAEMON_START_FAILED: 'daemon:start:failed',

        DAEMON_STOP_PENDING: 'daemon:stop:pending',
        DAEMON_STOP_SUCCESS: 'daemon:stop:success',
        DAEMON_STOP_FAILED: 'daemon:stop:failed',

        TINT_INSTALL: 'tint:install',
        TINT_UNINSTALL: 'tint:uninstall',

        RESOURCE_LOAD: 'resource:load',
        RESOURCE_INSTALL: 'resource:install',
        RESOURCE_UNINSTALL: 'resource:uninstall',
        RESOURCE_CLEANUP: 'resource:cleanup',

        DAEMON_INSTALL: 'daemon:install',
        DAEMON_UNINSTALL: 'daemon:uninstall',
        DAEMON_CLEANUP: 'daemon:cleanup',
        DAEMON_START: 'daemon:start',
        DAEMON_STOP: 'daemon:stop'
    }
};

function fire(name, state, payload) {
    var defer = Q.defer();

    payload.state = state;

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

function reply(name, id, state, payload) {
    var defer = Q.defer();

    payload.state = state;

    consul.event.fire(name + '@' + id, JSON.stringify(payload), function(err, result) {
        if (err) return defer.reject(err);

        defer.resolve(result);
    });

    return defer.promise;
}

function registerWatchHandler(eventName, fn) {
    var watch = registerWatch(eventName);

    watch.on('change', function(data) {
        fn(null, JSON.parse(data.Payload));
    });

    watch.on('error', function(err) {
        fn(err, null);
    });

    return Q(watch);
}

function registerWatch(eventName) {
    return consul.watch({ method: consul.event.list, options: { name: eventName }});
}

function registerWatchOnce(eventName, timeout) {
    var defer = Q.defer();

    var watch = registerWatch(eventName);

    watch.on('change', function(data) {
        var res = JSON.parse(data.Payload);

        if (res.state == 'success') defer.resolve(res);
        else if (res.state == 'failed') defer.reject(new Error(res.error));

        if (! timeout) watch.end();
    });

    watch.on('error', function(err) {
        defer.reject(err);

        if (! timeout) watch.end();
    });

    if (timeout) {
        setTimeout(function () {
            watch.end();
        }, timeout);
    }

    return defer.promise;
}