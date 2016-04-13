var resource = require('./resource'),
    system = require('./system'),
    kv = require('../store/kv'),
    Q = require('q');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('local.watcher.resource');

var watch = null;

module.exports = {
    start: startWatching,
    stop: stopWatching
};

function startWatching() {
    function flagChangeListener(err, data) {
        if (err) return processError(err);

        var value = JSON.parse(data.Value);

        var promise = null;
        if (data.Flags & kv.flags.CREATE) promise = processCreate(data.Key, value);
        if (data.Flags & kv.flags.UPDATE) promise = processUpdate(data.Key, value);
        if (data.Flags & kv.flags.REMOVE) promise = processRemove(data.Key, value);
        if (data.Flags & kv.flags.CLEANUP) promise = processCleanup(data.Key, value);

        if (promise == null)
            return kv.flag(data.Key, data.Flags - kv.flags.OPERATION_PENDING + kv.flags.OPERATION_OK);
        else
            return promise.then(
                function (data) {
                    var newFlag = data.Flags - kv.flags.OPERATION_PENDING + kv.flags.OPERATION_OK;
                    return kv.flag(data.Key, newFlag);
                },
                function(error) {
                    return kv.update(data.Key, function(data) {
                        data.error = error.message;
                        return data;
                    }).then(function() {
                        var newFlag = data.Flags - kv.flags.OPERATION_PENDING + kv.flags.OPERATION_FAILED;
                        return kv.flag(data.Key, newFlag);
                    });
                }
            )
    }

    watch = kv.listen('nodes/' + system.id + '/resources', flagChangeListener, true, [kv.flags.OPERATION_PENDING]);
}

function processError(error) {
    logger.error(error);
}

function stopWatching() {
    if (watch) watch.end();
}

function processCreate(key, data) {
    return resource.create(data);
}

function processUpdate(key, data) {
    return Q();
}

function processRemove(key, data) {
    return resource.remove(data);
}

function processCleanup(key, data) {
    return resource.clean();
}