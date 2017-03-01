const util = require('util');
const EventEmitter = require('events').EventEmitter;
var log4js = require('log4js'),
    Q = require('q');

var logger = log4js.getLogger();

var consul = require('consul')();

function Watcher() {
    EventEmitter.call(this);

    this.watches = [];
}

util.inherits(Watcher, EventEmitter);

Watcher.prototype.watchChanges = function(evtPrefix, method, opts) {
    var watch = consul.watch({ method: method, options: opts});
    var me = this;

    watch.on('change', function(data, res) { watchChangeHandler(me, evtPrefix, data, res); });
    watch.on('error', function(error) { watchErrorHandler(me, evtPrefix, error); });

    this.watches.push(watch);

    return watch;
};

Watcher.prototype.registerHandler = function(evtPrefix, handler) {
    if (handler.ready) this.on(evtPrefix + '.ready', function(data) { handleHandlerResponse(handler.ready(data.value, data.key)); });
    if (handler.created) this.on(evtPrefix + '.created', function(data) { handleHandlerResponse(handler.created(data.value, data.key)); });
    if (handler.updated) this.on(evtPrefix + '.updated', function(data) { handleHandlerResponse(handler.updated(data.value, data.key)); });
    if (handler.removed) this.on(evtPrefix + '.removed', function(data) { handleHandlerResponse(handler.removed(data.value, data.key)); });
    if (handler.cleanup) this.on(evtPrefix + '.cleanup', function() { handleHandlerResponse(handler.cleanup()); });
    if (handler.error) this.on(evtPrefix + '.error', function(err) { handleHandlerResponse(handler.error(err)); });
};

Watcher.prototype.destroy = function() {
    this.watches.forEach(function(watch) { watch.end(); });
};

module.exports = Watcher;

function watchChangeHandler(watcher, evtPrefix, data, res) {
    logger.debug('received KV change event for ' + evtPrefix);

    if (! data) { watcher.emit(evtPrefix + '.cleanup'); }
    else if (Array.isArray(data)) {
        data.forEach(function(kv) {
            var evt = null;
            switch(kv.Flags) {
                case 0:
                    evt = evtPrefix + '.created';
                    logger.debug(evtPrefix + ' state changed to CREATED');
                    break;
                case 1:
                    evt = evtPrefix + '.updated';
                    logger.debug(evtPrefix + ' state changed to UPDATED');
                    break;
                case 2:
                    evt = evtPrefix + '.ready';
                    logger.debug(evtPrefix + ' state changed to READY');
                    break;
                case 999:
                    evt = evtPrefix + '.removed';
                    logger.debug(evtPrefix + ' state changed to REMOVED');
                    break;
            }

            var value = JSON.parse(kv.Value);
            if (! value) return;

            if (evt != null) {
                watcher.emit(evt, {
                    key: kv.Key,
                    value: value
                });
            }
        });
    }
}

function watchErrorHandler(watcher, evtPrefix, error) {
    logger.error( evtPrefix + ' -> ' +  error);
    watcher.emit(evtPrefix + '.error', error);
}

function handleHandlerResponse(response) {
    Q.when(response, function(response) {
        logger.debug('Watch handler processing complete.');
    }, function(error) {
        logger.error('Error processing event:', error);
    }).done();
}