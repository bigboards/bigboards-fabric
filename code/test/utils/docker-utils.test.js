var test = require('unit.js');
var DockerUtils = require('../../utils/docker-utils');
var log4js = require('log4js');
var Q = require('q');

var Docker = require('dockerode');
var docker = new Docker();

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

    describe('container.start', function() {
        this.timeout(60000);

        before(function(done) {
            docker.createContainer({Image: "ubuntu", name: "test-2", "Command": "/bin/bash", Tty: true}, done);
        });

        after(function(done) {
            var container = docker.getContainer("test-2");
            container.remove({force: true}, done);
        });

        it('should start the container if it is not running yet', function() {
            return DockerUtils.container.start.byId("test-2")
                .then(function() {
                    return Q.delay(1000);
                }).then(function() {
                    return DockerUtils.container.status("test-2").then(function(status) {
                        test.should(status.Running).equal(true);
                    });
                });
        });

        it('should do nothing if the container is already running', function() {
            return DockerUtils.container.start.byId("test-2")
                .then(function() {
                    return Q.delay(1000);
                }).then(function() {
                    return DockerUtils.container.start.byId("test-2");
                }).then(function() {
                    return Q.delay(1000);
                }).then(function() {
                    return DockerUtils.container.status("test-2").then(function(status) {
                        test.should(status.Running).equal(true);
                    });
                });
        });
    });

    describe('container.stop', function() {
        this.timeout(60000);

        before(function(done) {
            docker.createContainer({Image: "ubuntu", name: "test-2", "Command": "/bin/bash", Tty: true}, function(err, data) {
                var container = docker.getContainer("test-2");
                container.start(done);
            });
        });

        after(function(done) {
            var container = docker.getContainer("test-2");
            container.remove({force: true}, done);
        });

        it('should stop the container if it is running', function() {
            return DockerUtils.container.stop.byId("test-2")
                .then(function() {
                    return Q.delay(1000);
                }).then(function() {
                    return DockerUtils.container.status("test-2").then(function(status) {
                        test.should(status.Running).equal(false);
                    });
                });
        });

        it('should do nothing if the container is already stopped', function() {
            return DockerUtils.container.stop.byId("test-2")
                .then(function() {
                    return Q.delay(1000);
                }).then(function() {
                    return DockerUtils.container.stop.byId("test-2");
                }).then(function() {
                    return Q.delay(1000);
                }).then(function() {
                    return DockerUtils.container.status("test-2").then(function(status) {
                        test.should(status.Running).equal(false);
                    });
                });
        });
    });
});