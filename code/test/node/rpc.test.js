var test = require('unit.js');
var log4js = require('log4js');
var Q = require('q');
var logger = log4js.getLogger('test.rpc');

var rpc = require('../../store/rpc');

describe('consul', function() {
    describe('rpc', function() {
        it ('should be able to call a remote handler', function(done) {
            rpc.handle('test-evt', function(name, id, state, data) {
                if (state != 'pending') return Q(null);

                logger.info('Handling event with payload ' + JSON.stringify(data));

                data.handled = true;

                return Q(data);
            });

            rpc.call('test-evt', {name: 'Daan Gerits'})
                .then(function(response) {
                    logger.info(response);
                    done();
                },
                function(error) {
                    logger.error(error);
                    done();
                })
        });
    });
});

