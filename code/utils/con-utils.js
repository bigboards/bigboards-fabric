var Q = require('q'),
    fs = require('./fs-utils'),
    yaml = require("js-yaml"),
    ini = require('ini'),
    swig = require('swig'),
    log4js = require('log4js'),
    mkdirp = require('mkdirp'),
    sh = require('shelljs');

var child_process = require('child_process');

var consul = require('consul')();
var logger = log4js.getLogger();

/**********************************************************************************************************************
 ** GENERAL
 *********************************************************************************************************************/
module.exports = {
    kv: {
        remove: removeKV,
        set: setKv,
        get: getKv,
        waitFor: waitFor,
        generate: generateKV
    },
    service: {
        register: registerService,
        deregister: deregisterService
    }
};

function generateKV(path, fsPath, variables, prefix) {
    var defer = Q.defer();

    logger.info('Generating consul:' + path + ' to ' + fsPath);

    consul.kv.get({key: path, recurse: true}, function(err, result) {
        if (err) {
            logger.debug('Unable to get template "' + path + '" from the consul state store: ' + err);
            return defer.reject(err);
        }

        if (!result) {
            logger.debug('Unable to get template "' + path + '" from the consul state store: Not Found!');
            return defer.reject('Not Found!');
        }

        result.forEach(function(template) {
            var filePath = template.Key;
            if (prefix) {
                filePath = filePath.substr(prefix.length + 1);
            }

            logger.debug('Generating consul:' + template.Key + ' to ' + fsPath + '/' + filePath);
            fs.generateString(template.Value, fsPath + '/' + filePath, variables);
        });

        defer.resolve();
    });

    return defer.promise;
}

function removeKV(path) {
    var defer = Q.defer();

    consul.kv.del({key:path, recurse: true}, function(err, data) {
        if (err) {
            logger.debug('Unable to remove key "' + path + '" from the consul state store: ' + err);
            return defer.reject(err);
        }

        return defer.resolve(data);
    });

    return defer.promise;
}

function setKv(path, value) {
    var defer = Q.defer();

    // -- Test to validate the value that is written to consul
    if (value && JSON.stringify(value).indexOf("Value") != -1)
        logger.error("[KV.SetFlag] Invalid Value written");

    consul.kv.set(path, JSON.stringify(value), function(err, data) {
        if (err) {
            logger.debug('Unable to set key "' + path + '" inside the consul state store: ' + err);
            return defer.reject(err);
        }

        return defer.resolve(data);
    });

    return defer.promise;
}

function getKv(path) {
    var defer = Q.defer();

    consul.kv.get(path, function(err, data) {
        if (err) {
            logger.debug('Unable to get key "' + path + '" from the consul state store: ' + err);
            return defer.reject(err);
        }

        if (!data) {
            logger.debug('Unable to get key "' + path + '" from the consul state store: Not Found!');
            return defer.reject('Not Found!');
        }

        return defer.resolve( (data.Value) ? JSON.parse(data.Value) : null);
    });

    return defer.promise;
}

function waitFor(path, timeout, evaluation) {
    var defer = Q.defer();

    var watch = consul.watch({ method: method, options: { key: path, recurse: false }});

    watch.on('change', function(data, res) {
        if (! data) return;

        if (Array.isArray(data)) {
            for (var idx in data) {
                if (! data.hasOwnProperty(idx)) continue;

                var value = JSON.parse(data[idx].Value);
                var result = evaluation(value);

                if (result === true) {
                    defer.resolve(data[idx]);
                    watch.end();
                    break;
                }
                else if (result === false) {
                    defer.reject(data[idx]);
                    watch.end();
                    break;
                }
            }
        }
    });

    watch.on('error', function(error) {
        defer.reject(error);
        watch.end();
    });


    setTimeout(function() {
        Q.reject('Timeout reached waiting for ' + path);
        watch.end();
    }, timeout);

    return defer.promise;
}

function registerService(service) {
    var defer = Q.defer();

    consul.agent.service.register(service, function(err) {
        if (err) {
            logger.debug('Unable to register the "' + service.ID + '" service: ', err);
            return defer.reject(err);
        }

        logger.debug('Registered the "' + service.ID + '" service: ', err);
        return defer.resolve(true);
    });

    return defer.promise;
}

function deregisterService(serviceId) {
    var defer = Q.defer();

    consul.agent.service.deregister(serviceId, function(err) {
        if (err) {
            logger.debug('Unable to deregister the "' + serviceId + '" service: ', err);
            return defer.reject(err);
        }

        return defer.resolve(true);
    });

    return defer.promise;
}