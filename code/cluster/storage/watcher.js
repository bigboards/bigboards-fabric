var kv = require('../../store/kv'),
    Storage = require('./index'),
    consulUtils = require('../../utils/consul-utils');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('storage.watcher');

function Watcher(prefix, regex, reactor) {
    this.prefix = prefix;
    this.reactor = reactor;
    this.watch = null;
    this.regex = regex;
}

Watcher.prototype.start = function() {
    var me = this;

    function flagChangeListener(err, data) {
        if (err) {
            if (me.reactor.hasOwnProperty('processError'))
                return me.reactor.processError(err);
            else
                logger.error(err);
        }

        var value = JSON.parse(data.Value);

        var handlerName = null;
        var operationFlag = null;
        if (data.Flags & consulUtils.flags.CREATE) {
            operationFlag = consulUtils.flags.CREATE;
            handlerName = 'processCreate';
        }
        if (data.Flags & consulUtils.flags.UPDATE) {
            operationFlag = consulUtils.flags.UPDATE;
            handlerName = 'processUpdate';
        }
        if (data.Flags & consulUtils.flags.REMOVE) {
            operationFlag = consulUtils.flags.REMOVE;
            handlerName = 'processRemove';
        }
        if (data.Flags & consulUtils.flags.CLEANUP) {
            operationFlag = consulUtils.flags.CLEANUP;
            handlerName = 'processCleanup';
        }
        if (data.Flags & consulUtils.flags.START) {
            operationFlag = consulUtils.flags.START;
            handlerName = 'processStart';
        }
        if (data.Flags & consulUtils.flags.STOP) {
            operationFlag = consulUtils.flags.STOP;
            handlerName = 'processStop';
        }

        // update the operation flag to PENDING so it will not be picked up again
        kv.flag(data.Key, operationFlag + consulUtils.flags.OPERATION_PENDING);

        if (handlerName && me.reactor.hasOwnProperty(handlerName)) {
            var promise = me.reactor[handlerName](data.Key, value);

            if (promise == null) {
                logger.debug('outcome of the ' + handlerName + ' handler is null');
                return kv.flag(data.Key, operationFlag + consulUtils.flags.OPERATION_OK);
            } else {
                logger.debug('outcome of the ' + handlerName + ' handler is a promise');
                return promise.then(
                    function () {
                        var newFlag = operationFlag + consulUtils.flags.OPERATION_OK;
                        return kv.flag(data.Key, newFlag).then(function() {
                            logger.debug('updated the flag of ' + data.Key + ' to ' + newFlag);
                        }, function(err) {
                            logger.warn('unable to update the flag of ' + data.Key + ' to ' + newFlag);
                        });
                    },
                    function (error) {
                        var newFlag = operationFlag + consulUtils.flags.OPERATION_FAILED;

                        logger.error(error);

                        // todo: We actually need a way to communicate the error back to the caller.
                        // Maybe the best way to do that is to create a temporary KV entry holding the error. The caller
                        // will have to remove the error once it has been handled. For now we will just print the error
                        // to log.
                        return kv.flag(data.Key, newFlag).then(function() {
                            logger.debug('updated the flag of ' + data.Key + ' to ' + newFlag);
                        }, function(err) {
                            logger.warn('unable to update the flag of ' + data.Key + ' to ' + newFlag);
                        });
                    }
                )
            }
        } else {
            logger.debug('no handler with name "' + handlerName + '" could be found in the reactor');
        }

    }

    this.watch = kv.listen(this.prefix, flagChangeListener, true, [consulUtils.flags.OPERATION_NEW]);
    logger.info('Started listening for changes on ' + this.prefix);
};

Watcher.prototype.stop = function() {
    if (this.watch) this.watch.end();
};

module.exports = Watcher;

