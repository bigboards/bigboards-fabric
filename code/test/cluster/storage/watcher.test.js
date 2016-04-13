var test = require('unit.js');
var Watcher = require('../../../cluster/storage/watcher');
var Storage = require('../../../cluster/storage');
var log4js = require('log4js');
var Q = require('q');
var kv = require('../../../store/kv');

describe('cluster', function() {
    describe('storage', function() {
        describe('watcher', function() {
            //this.timeout(600000);

            var logger = log4js.getLogger();

            it ('should react on a change in the consul key/value store', function(done) {
                var watcher = new Watcher("test-watcher", {
                    processCreate: function(consulEntry) {
                        logger.info('hooray!');
                        done();
                    },
                    processError: function(error) {
                        logger.error(error);
                        done();
                    }
                });

                watcher.start();

                kv.set('test-watcher/my-file', {name: 'Daan'}, false, Storage.flags.CREATE + Storage.flags.OPERATION_PENDING);
            });
        });
    });
});

