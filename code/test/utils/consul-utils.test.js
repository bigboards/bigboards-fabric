var test = require('unit.js');
var ConsulUtils = require('../../utils/consul-utils');
var log4js = require('log4js');
var Q = require('q');

describe('consul-utils', function() {
    describe('parseFlag', function() {
        it('should return a valid flag for a create operation', function() {
            validateParseFlag(ConsulUtils.flags.CREATE, ConsulUtils.flags.OPERATION_PENDING);
            validateParseFlag(ConsulUtils.flags.CREATE, ConsulUtils.flags.OPERATION_OK);
            validateParseFlag(ConsulUtils.flags.CREATE, ConsulUtils.flags.OPERATION_FAILED);
        });
        it('should return a valid flag for an update operation', function() {
            validateParseFlag(ConsulUtils.flags.UPDATE, ConsulUtils.flags.OPERATION_PENDING);
            validateParseFlag(ConsulUtils.flags.UPDATE, ConsulUtils.flags.OPERATION_OK);
            validateParseFlag(ConsulUtils.flags.UPDATE, ConsulUtils.flags.OPERATION_FAILED);
        });
        it('should return a valid flag for a remove operation', function() {
            validateParseFlag(ConsulUtils.flags.REMOVE, ConsulUtils.flags.OPERATION_PENDING);
            validateParseFlag(ConsulUtils.flags.REMOVE, ConsulUtils.flags.OPERATION_OK);
            validateParseFlag(ConsulUtils.flags.REMOVE, ConsulUtils.flags.OPERATION_FAILED);
        });
        it('should return a valid flag for a cleanup operation', function() {
            validateParseFlag(ConsulUtils.flags.CLEANUP, ConsulUtils.flags.OPERATION_PENDING);
            validateParseFlag(ConsulUtils.flags.CLEANUP, ConsulUtils.flags.OPERATION_OK);
            validateParseFlag(ConsulUtils.flags.CLEANUP, ConsulUtils.flags.OPERATION_FAILED);
        });
        it('should return a valid flag for a start operation', function() {
            validateParseFlag(ConsulUtils.flags.START, ConsulUtils.flags.OPERATION_PENDING);
            validateParseFlag(ConsulUtils.flags.START, ConsulUtils.flags.OPERATION_OK);
            validateParseFlag(ConsulUtils.flags.START, ConsulUtils.flags.OPERATION_FAILED);
        });
        it('should return a valid flag for a stop operation', function() {
            validateParseFlag(ConsulUtils.flags.STOP, ConsulUtils.flags.OPERATION_PENDING);
            validateParseFlag(ConsulUtils.flags.STOP, ConsulUtils.flags.OPERATION_OK);
            validateParseFlag(ConsulUtils.flags.STOP, ConsulUtils.flags.OPERATION_FAILED);
        });
    });

    function validateParseFlag(operation, state) {
        var flag = operation + state;

        var outcome = ConsulUtils.parseFlag(flag);
        test.should(outcome.operation).be.Number.and.equal(operation);
        test.should(outcome.state).be.Number.and.equal(state);
    }
});