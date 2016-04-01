
var Q = require('q');
var log4js = require('log4js');
var consul = require('consul')();
var sleep = require('sleep');

var logger = log4js.getLogger();

logger.info('Registring the watch');
//var keysWatch = registerWatch('keys', consul.kv.keys, {key: 'testDir', recurse: true});
var getWatch = registerWatch('get', consul.kv.get, {key: 'testDir', recurse: true});

perform(function() {
    logger.info('Adding a new key');
    consul.kv.set({key: 'testDir/testKey', value: 'my data'}, errorHandler);
})
.then(function() {
    return perform(function() {
        logger.info('Update Flag');
        consul.kv.set({key: 'testDir/testKey', value: 'my data', flags: 5}, errorHandler);
    })
})
.then(function() {
    return perform(function() {
        logger.info('Removing a key');
        consul.kv.del({key: 'testDir', recurse: true}, errorHandler);
    })
})
.then(function() {
    return perform(function() {
        logger.info('Removing the watch');
        getWatch.end();
    });
});

//setTimeout(function() {
//    logger.info('Removing a key');
//    consul.kv.del({
//        key: 'testDir',
//        recurse: true
//    }, errorHandler);
//
//    setTimeout(function() {
//        logger.info('Removing the watch');
//        //keysWatch.end();
//        getWatch.end();
//    }, 2000);
//}, 2000);

function registerWatch(description, method, opts) {
    var watch = consul.watch({ method: method, options: opts});

    watch.on('change', function(data, res) {
        logger.warn(description + ' change: ' + JSON.stringify(data));
    });

    watch.on('error', function(error) {
        logger.error(description + ' error: ' + error);
    });

    return watch;
}

function errorHandler(err) {
    if (err) logger.error(err);
}

function perform(action) {
    var defer = Q.defer();

    action();

    setTimeout(function() {
        defer.resolve();
    }, 2000);


    return defer.promise;
}