var daemon = require('./daemon'),
    system = require('./system'),
    kv = require('../store/kv'),
    Q = require('q');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('local.reactor.daemon');

module.exports = {
    processError: processError,
    processCreate: processCreate,
    processUpdate: processUpdate,
    processRemove: processRemove,
    processCleanup: processCleanup,
    processStart: processStart,
    processStop: processStop
};

function processError(error) {
    logger.error(error);
}

function processCreate(key, data) {
    logger.info('Creating daemon ' + data.id);

    return daemon.create(data).then(
        function() { logger.info('created daemon ' + data.id) },
        function(error) { logger.error(error); }
    );
}

function processUpdate(key, data) {
    return Q();
}

function processRemove(key) {
    // -- a daemon you want to remove has no data associated with it since it is merely a folder holding
    // -- the actual daemons. This means we need to parse the key and pass that result.
    var regex = new RegExp("nodes/(.*)/daemons/(.*)/(.*)/(.*)");
    var parts = key.match(regex);

    return kv.get.key('tints/' + parts[2] + '/' + parts[3]).then(function(tint) {
        // -- get the definition from the tint
        var driverId = null;
        var serviceId = null;
        var daemonId = null;
        tint.services.forEach(function(service) {
            service.daemons.forEach(function(daemon) {
                var id = service.id + '-' + daemon.id + '-' + system.id;
                if (id == parts[4]) {
                    driverId = daemon.driver;
                    daemonId = daemon.id;
                    serviceId = service.id;
                }
            });
        });

        if (!driverId || !daemonId) return Q.reject(new Error("Unable to determine which daemon to remove"));
        logger.info('Removing daemon ' + serviceId + '-' + daemonId);

        return daemon.remove(driverId, serviceId, daemonId).then(
            function() { logger.info('removed daemon ' + serviceId + '-' + daemonId) },
            function(error) { logger.error(error); }
        );
    });
}

function processCleanup() {
    logger.info('Removing all daemons');

    return daemon.clean().then(
        function() { logger.info('removed all daemons') },
        function(error) { logger.error(error); }
    );
}

function processStart(key, data) {
    logger.info('Starting daemon ' + data.id);

    return daemon.start(data).then(
        function() { logger.info('started daemon ' + data.id) },
        function(error) { logger.error(error); }
    );
}

function processStop(key, data) {
    logger.info('Stopping daemon ' + data.id);

    return daemon.stop(data).then(
        function() { logger.info('stopped daemon ' + data.id) },
        function(error) { logger.error(error); }
    );
}