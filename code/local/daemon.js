var events = require('../store/events'),
    services = require('../store/services'),
    kv = require('../store/kv'),
    system = require('./system'),
    settings = require('../settings'),
    drivers = require('./drivers'),
    Q = require('q');

// -- utilities
var consulUtils = require('../utils/consul-utils'),
    shellUtils = require('../utils/sh-utils');

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

function createDaemon(daemon, key) {
    var evt = {
        tint: daemon.tint,
        service: daemon.service,
        daemon: daemon.daemon,
        node: system.id
    };

    var driver = drivers[daemon.driver];
    if (! driver)
        return events.fire(events.names.DAEMON_INSTALL_FAILED, evt)
            .then(function() {
                return Q.reject('Unknown daemon driver "' + daemon.driver + '"');
            });

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
        })
        .then(function() {
            return kv.flag(key, 2);
        })
        .then(
            function() {
                return events.fire(events.names.DAEMON_INSTALL_SUCCESS, evt);
            },
            function(error) {
                evt.error = error.message;
                return events.fire(events.names.DAEMON_INSTALL_FAILED, evt);
            }
        );
}

function removeDaemon(daemon, key) {
    var evt = {
        tint: daemon.tint,
        service: daemon.service,
        daemon: daemon.daemon,
        node: system.id
    };

    var driver = drivers[daemon.driver];
    if (! driver)
        return events.fire(events.names.DAEMON_UNINSTALL_FAILED, evt)
            .then(function() {
                return Q.reject('Unknown daemon driver "' + daemon.driver + '"');
            });

    return driver.remove(daemon.id)
        .then(function() {
            return kv.remove.key(key)
        })
        .then(function() {
            return services.deregister(daemon.id);
        })
        .then(
            function() {
                return events.fire(events.names.DAEMON_UNINSTALL_SUCCESS, evt);
            },
            function(error) {
                evt.error = error.message;
                return events.fire(events.names.DAEMON_UNINSTALL_FAILED, evt);
            }
        );
}

function cleanDaemons() {
    var evt = {
        node: system.id
    };

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
        })
        .then(
            function() {
                return events.fire(events.names.DAEMON_CLEANUP_SUCCESS, evt);
            },
            function(error) {
                evt.error = error.message;
                return events.fire(events.names.DAEMON_CLEANUP_FAILED, evt);
            }
        );
}

function startDaemon(daemon) {
    var driver = drivers[daemon.driver];

    return driver.start(daemon.id)
        .then(
            function() {
                return events.fire(events.names.DAEMON_START_SUCCESS, evt);
            },
            function(error) {
                evt.error = error.message;
                return events.fire(events.names.DAEMON_START_FAILED, evt);
            }
        );
}

function stopDaemon(daemon) {
    var driver = drivers[daemon.driver];

    return driver.start(daemon.id)
        .then(
            function() {
                return events.fire(events.names.DAEMON_STOP_SUCCESS, evt);
            },
            function(error) {
                evt.error = error.message;
                return events.fire(events.names.DAEMON_STOP_FAILED, evt);
            }
        );
}