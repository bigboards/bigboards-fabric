var test = require('unit.js');
var Storage = require('../../../cluster/storage');
var log4js = require('log4js');
var Q = require('q');

describe('cluster', function() {
    describe('storage', function() {
        describe('create', function() {
            this.timeout(600000);

            var logger = log4js.getLogger();
            var storage = new Storage("test");

            it ('should create a key value pair in consul and wait for the create event to be handled ', function() {
                var hasBeenCreated = false;

                storage.handle(Storage.flags.CREATE, function() {
                    hasBeenCreated = true;
                    logger.info("setting ... ");
                });

                return storage.create('my-awesome-key', {name: "Daan"}).then(function() {
                    if (!hasBeenCreated) throw new Error("The handler has not been executed");

                    logger.info("hooray!");
                }, function(error) {
                    logger.error(error);
                    throw error;
                });
            });

            it ('should throw an error if something went wrong in the handler ', function() {
                storage.handle(Storage.flags.CREATE, function() {
                    return Q.reject(new Error("Something went wrong ..."));
                });

                return storage.create('my-awesome-key', {name: "Daan"}).then(function() {
                    throw new Error("An error should have been thrown!");
                }, function(error) {
                    logger.info("hooray!");
                    return null;
                });
            });

        });
    });
});

