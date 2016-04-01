var Docker = require('dockerode'),
    Log4js = require('log4js'),
    du = require('./docker-utils'),
    sh = require('../utils/sh-utils'),
    nodeInfo = require('../node'),
    kv = require('../store/kv');

var config = require('../config').lookupEnvironment();
var logger = Log4js.getLogger('docker');
var docker = new Docker();

module.exports = {
    clean: clean,
    removeContainer: removeContainer,
    createContainer: createContainer
};

function clean() {
    return du.container.list({all: true})
        .then(function(containers) {
            if (containers.length == 0) {
                logger.info('[all] No need to destroy docker containers because there are none');
            } else {
                logger.info('[all] Preparing to destroy ' + containers.length + ' docker containers');

                var promises = [];

                containers.forEach(function (containerInfo) {
                    var container = docker.getContainer(containerInfo.Id);

                    promises.push(du.container.destroy(container, {force: true})
                        .then(function() {
                            // -- remove the container directory
                            return Q(sh.rm(config.dir.data + '/containers/' + container.name, {sudo: config.sudo, flags: 'rf'}));
                        })
                    );
                });

                return Q.all(promises);
            }
        }, function(error) {
            logger.error('[all] Unable to get the list of docker containers: ' + error);
        });
}

function removeContainer(container) {
    return du.container.get(container.name).then(function(dockerContainer) {
        return du.container.destroy(dockerContainer, {force: true})
            .then(function() {
                // -- remove the container directory
                return Q(sh.rm(config.dir.data + '/containers/' + container.name, {sudo: config.sudo, flags: 'rf'}));
            });
    });
}

function createContainer(container, registry) {
    logger.info('Creating container ' + container.name);
    logger.info('Pulling the ' + container.image + ' image');

    var options = {};
    if (registry) {
        options.authConfig = {
            username: registry.username,
            password: registry.password,
            email: registry.email,
            serveraddress: registry.address
        }
    }

    return Q.all([
        du.image.pull(container.image, options),
        _createVolumeMounts(container)
    ]).then(function(results) {
        var stream = results[0];

        var defer = Q.defer();

        stream.on('data', function (chunk) {
            logger.debug(chunk.toString('utf8'));
        });

        stream.on('end', function () {
            logger.info('Pulled the ' + container.image + ' image');

            var options = containerToDockerOptions(container);

            defer.resolve(du.container.create(options));
        });

        return defer.promise;
    });
}

function _createVolumeMounts(container) {
    logger.debug('create the resources needed by the docker container');

    var volumes = container.volumes;
    if (!volumes) {
        logger.debug('no volumes have been defined, so we will not generate any data on the FS');
        return Q();
    }

    logger.debug('Iterate the volumes as they are defined in the container configuration');

    // -- create the directory in which to store the configuration
    var containerFsDir = config.dir.data + '/containers/' + container.name;
    var containerConfigDir = containerFsDir + '/ config';
    sh.mkdir(containerConfigDir, {sudo: config.sudo, flags: 'p'});

    var promises = [];
    volumes.forEach(function(volume) {
        logger.debug('Check if the source of the volume is relative or absolute');

        var filenameOnFs;
        if (volume.host.indexOf('config:') == 0) {
            // -- mount a configuration volume. This means we will take the data from consul and generate it into the
            // -- configuration folder on the FS
            filenameOnFs = containerFsDir + '/' + volume.host.substr('config:'.length);
            volume.host = containerConfigDir + '/' + volume.host;

            promises.push(kv.generate(
                '/resources/' + filenameOnFs,
                containerConfigDir,
                createScope(container),
                '/resources/' + filenameOnFs
            ));

        } else if (volume.host.indexOf('data:') == 0) {
            // -- mount a data directory.
            // -- data directories are used to store data that can be accessed by the host OS while also being available
            // -- inside the container

            filenameOnFs = containerFsDir + '/data/' + volume.host.substr('data:'.length);
            sh.mkdir(filenameOnFs, {sudo: config.sudo, flags: 'p'});

        } else {
            logger.debug('Absolute path, so it should be resolved against the fs root');

        }
    });

    return Q.all(promises);
}

function createScope(container) {
    var variables = {
        config: config,
        device: nodeInfo,
        container_dir: config.dir.data + '/containers/' + container.name,
        container_config_dir: config.dir.data + '/containers/' + container.name + '/config',
        container_data_dir: config.dir.data + '/containers/' + container.name + '/data'
    };

    return variables;
}

function containerToDockerOptions(container) {
    var options = {
        Image: container.image
    };

    return options;
}