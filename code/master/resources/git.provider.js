var gift = require('gift'),
    Q = require('q'),
    fu = require('../../utils/fs-utils'),
    uuid = require('node-uuid'),
    log4js = require('log4js'),
    kv = require('../../store/kv');

var logger = log4js.getLogger('resource.dispatcher.git');

module.exports = {
    toConsul: toConsul
};

function toConsul(keyPrefix, configuration) {
    var path = '/tmp/bb-resource-' + uuid.v4();
    var url = configuration.url;
    if (! url) return Q.reject('No url has been set for the git repository');

    logger.debug('do a checkout to a temporary folder');
    return clone(url, path, configuration.branch)
        .then(function() {
            logger.debug('iterate through the files and for each file, put it in consul');

            try {
                return readPath(keyPrefix, path, '')
                    .then(function() {
                        fu.rmdir(path);
                    });
            } catch (error) {
                return Q.reject(error);
            }
        });
}

function readPath(keyPrefix, path, kvPath) {
    var promises = [];

    var files = fu.readDir(path);
    files.forEach(function(file) {
        if (file.indexOf('.') == 0) return;

        logger.debug('processing ' + kvPath + '/' + file);

        if (fu.isDirectory(path + '/' + file)) {
            promises.push(readPath(keyPrefix, path + '/' + file, kvPath + '/' + file));
        } else {
            promises.push(generateFile(keyPrefix, kvPath, path, file));
        }
    });

    return Q.all(promises);
}

function generateFile(keyPrefix, kvPath, fsPath, file) {
    var defer = Q.defer();
    var content = fu.readFile(fsPath + '/' + file);

    kv.raw.set(keyPrefix + kvPath + '/' + file, content).then(function() {
        logger.debug('generated ' + kvPath + '/' + file);
        defer.resolve(true);
    }, function (error) {
        resolve.reject(error);
        logger.warn('Unable to generate ' + kvPath + '/' + file + ': ', error);
    });

    return defer.promise;
}

function clone(repoUrl, repoPath, branch) {
    var defer = Q.defer();

    fu.rmdir(repoPath);

    logger.info("Cloning the configuration repository " + repoUrl + " to " + repoPath);

    gift.clone(repoUrl, repoPath, function(err, repo) {
        if (err) defer.reject(err);

        // -- try to checkout the branch with the current firmware
        repo.checkout(branch, function(err) {
            if (err) {
                logger.debug("Using the master as configuration branch ");
                defer.resolve(repo);
            } else {
                logger.debug("Using configuration branch " + branch);

                repo.checkout(branch, function(err) {
                    if (err) defer.reject(err);
                    else defer.resolve(repo);
                });
            }
        });
    });

    return defer.promise;
}