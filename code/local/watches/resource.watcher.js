var resource = require('../resource'),
    system = require('../system'),
    events = require('../../store/events');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('local.watcher.resource');

var watches = {
    install: null,
    uninstall: null,
    cleanup: null
};

module.exports = {
    start: startWatching,
    stop: stopWatching
};

function startWatching() {
    watches.install = events.watch(events.names.RESOURCE_INSTALL, processInstallEvent);
    watches.uninstall = events.watch(events.names.RESOURCE_UNINSTALL, processUninstallEvent);
    watches.cleanup = events.watch(events.names.RESOURCE_CLEANUP, processCleanupEvent);
}

function stopWatching() {
    if (watches.install) watches.install.end();
    if (watches.uninstall) watches.uninstall.end();
    if (watches.cleanup) watches.cleanup.end();
}

function processInstallEvent(event) {
    var responseEvent = {
        id: event.id,
        node: system.id
    };

    return resource.create(event.definition)
        .then(
            function() {
                events.reply(events.names.RESOURCE_INSTALL, event.id, events.state.SUCCESS, responseEvent);
            },
            function(error) {
                responseEvent.error = error.message;
                events.reply(events.names.RESOURCE_INSTALL, event.id, events.state.FAILED, responseEvent);
            }
        );
}

function processUninstallEvent(event) {
    var responseEvent = {
        id: event.id,
        node: system.id
    };

    return resource.remove(event.definition)
        .then(
            function() {
                events.reply(events.names.RESOURCE_UNINSTALL, event.id, events.state.SUCCESS, responseEvent);
            },
            function(error) {
                responseEvent.error = error.message;
                events.reply(events.names.RESOURCE_UNINSTALL, event.id, events.state.FAILED, responseEvent);
            }
        );

}

function processCleanupEvent(event) {
    var responseEvent = {
        id: event.id,
        node: system.id
    };

    return resource.clean()
        .then(
            function() {
                events.reply(events.names.RESOURCE_CLEANUP, event.id, events.state.SUCCESS, responseEvent);
            },
            function(error) {
                responseEvent.error = error.message;
                events.reply(events.names.RESOURCE_CLEANUP, event.id, events.state.FAILED, responseEvent);
            }
        );
}