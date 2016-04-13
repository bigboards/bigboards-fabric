var Q = require('q');
var consul = require('consul')();
var uuid = require('node-uuid');

module.exports = {
    call: call,
    handle: handle,
    state: states,
    names: {
        DAEMON_INSTALL: 'daemon:install',
        DAEMON_UNINSTALL: 'daemon:uninstall',
        DAEMON_CLEANUP: 'daemon:cleanup',
        DAEMON_START: 'daemon:start',
        DAEMON_STOP: 'daemon:stop'
    }
};

var states = {
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILED: 'failed'
};

function call(name, payload, timeout) {
    var defer = Q.defer();

    var envelope = {
        id: uuid.v4(),
        state: states.PENDING,
        data: payload
    };

    var eventName = 'rpc:' + name;

    // -- start listening for a response
    var responseWatch = consul.watch({ method: consul.event.list, options: { name: 'rpc:' + eventName + '@' + envelope.id }});
    var timedOut = false;

    // -- listen for changes since that will actually be our response
    responseWatch.on('change', function(data) {
        if (data.length == 0) return;
        var res = JSON.parse(data[0].Payload);

        if (res.state == states.SUCCESS) defer.resolve(res);
        else if (res.state == states.FAILED) defer.reject(new Error(res.error));

        if (!timeout && !timedOut) {
            timedOut = true;
            responseWatch.end();
        }
    });

    responseWatch.on('error', function(err) {
        defer.reject(err);

        if (!timeout && !timedOut) {
            timedOut = true;
            responseWatch.end();
        }
    });

    if (timeout) {
        setTimeout(function () {
            if (!timedOut) {
                timedOut = true;
                responseWatch.end();
            }
        }, timeout);
    }

    consul.event.fire(eventName, JSON.stringify(envelope), function(err, result) {
        if (err) return defer.reject(err);
    });

    return defer.promise;
}

function handle(name, fn) {
    var watch = consul.watch({ method: consul.event.list, options: { name: 'rpc:' + name }});

    // -- listen for changes since that will actually be our response
    watch.on('change', function(data) {
        data.forEach(function(data) {
            _handleEvent(name, data, fn);
        });
    });

    return watch;
}

function _handleEvent(name, data, fn) {
    var envelope = JSON.parse(data.Payload);

    var responseEnvelope = {
        id: envelope.id
    };

    fn(name, envelope.id, envelope.state, envelope.data).then(
        function(result) {
            responseEnvelope.state = states.SUCCESS;
            responseEnvelope.data = result;

            var eventName = 'rpc:' + name + '@' + responseEnvelope.id;

            consul.event.fire(eventName, JSON.stringify(responseEnvelope), function(err, result) { });
        },
        function(error) {
            responseEnvelope.state = states.FAILED;
            responseEnvelope.error = error;

            var eventName = 'rpc:' + name + '@' + responseEnvelope.id;

            consul.event.fire(eventName, JSON.stringify(responseEnvelope), function(err, result) { });
        }
    );
}