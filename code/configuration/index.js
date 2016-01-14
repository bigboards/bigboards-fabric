var fs = require("fs"),
    fsu = require("../utils/fs-utils"),
    Q = require('q'),
    ini = require('ini'),
    winston = require('winston');

function HexConfigurationManager(hexConfigFile) {
    this.hexConfigFile = hexConfigFile;
    this.config = null;
}

HexConfigurationManager.prototype.get = function() {
    var self = this;

    if (!this.config) {
        return fsu.exists(this.hexConfigFile).then(function(exists) {
            if (exists) {
                return self.load().then(function(config) {
                    self.config = config;
                    return self.config;
                });
            } else {
                return Q(null);
            }
        });
    } else {
        return Q(this.config);
    }
};

HexConfigurationManager.prototype.load = function() {
    var deferrer = Q.defer();

    var readFile = Q.denodeify(fs.readFile);

    readFile(this.hexConfigFile, {encoding: 'utf8'}).then(function(data) {
        try {
            var config = ini.parse(data);

            winston.log('info', 'read the configuration file');
            deferrer.resolve(config);
        } catch (error) {
            winston.log('error', 'error while reading the configuration file: ' + error);
            winston.log('error', error.stack);
            deferrer.reject(error);
        }
    }).fail(function(error) {
        deferrer.reject(error);
    });

    return deferrer.promise;
};

HexConfigurationManager.prototype.save = function(hex) {
    var self = this;
    var deferrer = Q.defer();
    var writeFile = Q.denodeify(fs.writeFile);

    // -- validate the data we want to write
    if (!hex || !hex.id || !hex.name)
        throw new Error('Invalid configuration object!');

    try {
        var content = ini.stringify(hex, { whitespace: true });

        writeFile(this.hexConfigFile, content)
            .then(function(data) {
                self.config = content;
                deferrer.resolve();
            }).fail(function(error) {
                deferrer.reject(error);
            });
    } catch (error) {
        deferrer.reject(error);
    }

    return deferrer.promise;
};

module.exports = HexConfigurationManager;