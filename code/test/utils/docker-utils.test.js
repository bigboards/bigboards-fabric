var test = require('unit.js');
var DockerUtils = require('../../utils/docker-utils');
var log4js = require('log4js');
var Q = require('q');

describe('docker-utils', function() {
    describe('container.exists', function() {
        it('should return false if the container does not exist', function() {
            return DockerUtils.container.exists('boengawoenga')
                .then(function(exists) {
                    test.should(exists).equal(false);
                })
        });

        it('should return true if the container exists', function() {
            var container = {Image: "ubuntu", name: "test-1"};

            return DockerUtils.container.create(container).then(function() {
                return DockerUtils.container.exists('test-1')
                    .then(function(exists) {
                        test.should(exists).equal(true);
                    });
            }).finally(function() {
                DockerUtils.container.destroy.byId('test-1');
            });
        });
    });
});