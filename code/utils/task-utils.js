var Ansible = require('../mods/ansible/index.js'),
    path = require('path'),
    fsu = require('./fs-utils'),
    Q = require('q');

module.exports.playbook = function(env, playbook, parameters) {
    var hostsFile = env.hostFile;
    var workdir = env.workdir;
    var verbose = env.verbose || false;

    var deferred = Q.defer();

    var pb = new Ansible.Playbook()
        .inventory(hostsFile)
        .playbook(playbook)
        .variables(parameters);

    if (verbose) pb.verbose('vvvv');

    fsu.exists(workdir).then(function(exists) {
        if (exists) {
            try {
                pb.exec({cwd: workdir})
                    .then(function (result) {
                        if (result.code != 0) deferred.reject(new Error(result.code));
                        else deferred.resolve();
                    }, function (error) {
                        deferred.reject(error);
                    }, function (progress) {
                        deferred.notify(progress);
                    });
            } catch (error) {
                deferred.reject(error);
            }
        } else {
            deferred.reject(new Error(workdir + ' does not exist! Please define it relative to ' + process.cwd()));
        }
    });

    return deferred.promise;
};

module.exports.removeFile = function(path, verbose, cwd) {
    var deferred = Q.defer();

    var pb = new Ansible.AdHoc()
        .hosts('localhost')
        .module('file')
        .asSudo()
        .args({state: 'absent', path: path});

    if (verbose)
        pb.verbose('vvvv');

    console.log('removing file ' + path + ' from localhost');

    pb.exec({cwd: cwd})
        .then(function(result) {
            if (result.code != 0) deferred.reject(new Error(result.code));
            else deferred.resolve();
        }, function(error) {
            deferred.reject(error);
        }, function(progress) {
            deferred.notify(progress);
        });

    return deferred.promise;
};
