var test = require('unit.js');
var node = require('../../node/node');
var du = require('../../utils/docker-utils');
var log4js = require('log4js');
var Q = require('q');
var logger = log4js.getLogger();

describe('node', function() {
    describe('containers', function() {
        describe('pull', function() {
            this.timeout(600000);

            it ('should fail if trying to pull a non-existing  image ', function(done) {
                var containerDefinition = {
                    Image: 'foobar-bogus-image'
                };

                node.container.pull(containerDefinition)
                    .then(function() {
                        test.fail('We should have failed!');
                    }, function(error) {
                        test.error(error);
                    }).finally(function() { done(); });
            });

            it ('should pull a basic docker image ', function(done) {
                var containerDefinition = {
                    Image: 'ubuntu'
                };

                node.container.pull(containerDefinition)
                    .fail(function(error) {
                        test.fail(error.message);
                    })
                    .finally(function() { done(); });
            });

            it ('should pull an architecture aware docker image ', function(done) {
                var containerDefinition = {
                    Image: 'bigboards/elasticsearch',
                    ArchitectureAware: true
                };

                node.container.pull(containerDefinition)
                    .fail(function(error) {
                        test.fail(error.message);
                    })
                    .finally(function() { done(); });
            });
        });

        describe('create', function() {
            this.timeout(30000);
            var containerId;

            afterEach(function() {
                logger.info('Cleaning up');
                if (containerId) {
                    du.container.destroy.byId(containerId).then(function () {
                        logger.info('Removed container with id ' + containerId);
                    }, function (error) {
                        logger.error(error);
                    });

                    containerId = null;
                }
            });


            it('should create a container', function(done) {
                var containerDefinition = {
                    Image: 'ubuntu'
                };

                createContainer(containerDefinition, done).done();
            });

            it('should create a container for a specific architecture if requested', function(done) {
                var containerDefinition = {
                    Image: 'bigboards/elasticsearch',
                    ArchitectureAware: true
                };

                createContainer(containerDefinition, done).done();
            });

            it('should create a container with a valid name', function(done) {
                var containerDefinition = {
                    Image: 'bigboards/elasticsearch',
                    ArchitectureAware: true,
                    name: 'MyAwesomeName'
                };

                createContainer(containerDefinition, done, function(container) {
                    return du.container.detail(container).then(function(containerDetail) {
                        test.string(containerDetail.Name);
                        test.value(containerDetail.Name).isEqualTo('/MyAwesomeName');
                    });
                }).done();
            });

            function createContainer(definition, done, promiseFn) {
                return node.container.create(definition)
                    .then(function(id) {
                        test.string(id);
                        logger.info('Created container with id ' + id);
                        containerId = id;

                        return du.container.get.byId(id)
                            .then(function(container) {
                                test.object(container);

                                if (promiseFn) {
                                    return promiseFn(container);
                                } else {
                                    return Q();
                                }
                            });
                    }).fail(function(error) {
                        test.fail(error.message);
                        done();
                    }).then(function() {
                        done();
                    });

            }
        });

        describe('remove', function() {
            this.timeout(30000);
            var containerIds = [];

            afterEach(function(done) {
                logger.info('Cleaning up');
                if (containerIds) {
                    var promises = [];
                    containerIds.forEach(function(id) {
                        promises.push(du.container.destroy.byId(id).then(function () {
                            logger.info('Removed container with id ' + id);
                        }, function (error) {
                            logger.warn(error);
                        }));
                    });

                    Q.allSettled(promises).then(function() {
                        done();
                    });

                    containerIds = [];
                }
            });

            describe('by tag or id', function() {
                it('should remove a container giving a container id', function(done) {
                    // -- first create a container that we will remove later
                    node.container.create({ Image: 'ubuntu' }).then(function(id) {
                        test.string(id);
                        containerIds.push(id);

                        node.container.remove.byId(id).then(function() {
                            done();
                        }, function(error) {
                            test.fail('Unable to remove the container: ' + error.message);
                            done();
                        });
                    }, function(error) {
                        test.fail('Unable to create the container: ' + error.message);
                        done();
                    }).done();
                });

                it('should remove a container giving a container name', function(done) {
                    // -- first create a container that we will remove later
                    node.container.create({ Image: 'ubuntu', name: 'myContainer' }).then(function(id) {
                        test.string(id);
                        containerIds.push(id);

                        node.container.remove.byName('myContainer').then(function() {
                            done();
                        }, function(error) {
                            test.fail('Unable to remove the container: ' + error.message);
                            done();
                        });
                    }, function(error) {
                        test.fail('Unable to create the container: ' + error.message);
                        done();
                    }).done();
                });
            });

            describe('all', function() {
                it('should remove all containers', function(done) {
                    done();
                });
            });


        })
    });

    describe('resources', function() {

    });
});

