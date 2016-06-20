var events = require('../store/events'),
    services = require('../store/services'),
    kv = require('../store/kv'),
    system = require('./system'),
    drivers = require('./drivers'),
    Q = require('q');

// -- logging
var log4js = require('log4js'),
    logger = log4js.getLogger('local.daemon');


module.exports = {
    create: createDaemon,
    remove: removeDaemon,
    clean: cleanDaemons,
    start: startDaemon,
    stop: stopDaemon
};

function createDaemon(daemon) {
    var driver = drivers[daemon.driver];
    if (! driver)
        return Q.reject('Unknown daemon driver "' + daemon.driver + '"');

    logger.debug('Creating daemon ' + daemon.id + ' using driver ' + daemon.driver);

    var configuration = daemon.configuration;
    configuration.name = daemon.id;

    var serviceDescriptor = {
        name: daemon.daemon,
        id: daemon.service + '-' + daemon.daemon,
        tags: [ 'docker', daemon.daemon ],
        check: {
            script: process.cwd() + '/scripts/check_docker_container.sh ' + daemon.id,
            interval: '15s'
        }
    };

    return services.register(serviceDescriptor)
        .then(function() {
            return driver.create(configuration);
        });
}

function removeDaemon(driverId, serviceId, daemonId) {
    var driver = drivers[driverId];
    if (! driver)
        return Q.reject('Unknown daemon driver "' + driverId + '"');

    logger.info("Removing " + serviceId + '-' + daemonId);

    return driver.remove(serviceId + '-' + daemonId + '-' + system.id)
        .then(function() {
            return services.deregister(serviceId + '-' + daemonId);
        });
}

function cleanDaemons() {
    return kv.list('nodes/' + system.id + '/daemons/')
        .then(function (keys) {
            var promises = [];

            keys.forEach(function(key) {
                promises.push(kv.get.key(key).then(function(data) {
                    var driver = drivers[data.driver];
                    return driver.remove(data.id)
                        .then(function(data) {
                            return services.deregister(data.id)
                        })
                        .then(function() {
                            return kv.remove.key(key);
                        });
                }));
            });

            return Q.all(promises);
        });
}

function startDaemon(daemon) {
    var driver = drivers[daemon.driver];

    return driver.start(daemon.id);
}

function stopDaemon(daemon) {
    var driver = drivers[daemon.driver];

    return driver.start(daemon.id);
}