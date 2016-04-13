var kv = require('../../store/kv');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('master.watcher.tint');

function Watcher(prefix, reactor) {
    this.prefix = prefix;
    this.reactor = reactor;
    this.watch = null;
}

Watcher.prototype.start = function() {
    var me = this;

    function flagChangeListener(err, data) {
        if (err) return processError(err);

        logger.debug('Tint operation occured: ' + JSON.stringify(data));

        var value = JSON.parse(data.Value);

        var handlerName = null;
        if (data.Flags & kv.flags.CREATE) handlerName = 'processCreate';
        if (data.Flags & kv.flags.UPDATE) handlerName = 'processUpdate';
        if (data.Flags & kv.flags.REMOVE) handlerName = 'processRemove';
        if (data.Flags & kv.flags.CLEANUP) handlerName = 'processCleanup';
        if (data.Flags & kv.flags.START) handlerName = 'processStart';
        if (data.Flags & kv.flags.STOP) handlerName = 'processStop';

        if (me.reactor.hasOwnProperty(handlerName)) {
            var promise = me.reactor[handlerName](data.Key, value);

            if (promise == null) {
                logger.debug('outcome of the handler is null');
                return kv.flag(data.Key, data.Flags - kv.flags.OPERATION_PENDING + kv.flags.OPERATION_OK);
            } else {
                return promise.then(
                    function (data) {
                        var newFlag = data.Flags - kv.flags.OPERATION_PENDING + kv.flags.OPERATION_OK;
                        return kv.flag(data.Key, newFlag);
                    },
                    function (error) {
                        return kv.update(data.Key, function (data) {
                            data.error = error.message;
                            return data;
                        }).then(function () {
                            var newFlag = data.Flags - kv.flags.OPERATION_PENDING + kv.flags.OPERATION_FAILED;
                            return kv.flag(data.Key, newFlag);
                        });
                    }
                )
            }
        } else {
            logger.debug('no handler with name "' + handlerName + '" could be found in the reactor');
        }

    }

    this.watch = kv.listen(this.prefix, flagChangeListener, true, [kv.flags.OPERATION_PENDING]);
};

Watcher.prototype.stop = function() {
    if (this.watch) this.watch.end();
};

module.exports = Watcher;

