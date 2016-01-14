var Q = require('q'),
    fs = require('fs'),
    yaml = require("js-yaml"),
    ini = require('ini'),
    mkdirp = require('mkdirp');

/**********************************************************************************************************************
 ** GENERAL
 *********************************************************************************************************************/

module.exports.absolute = function(path) {
    var p = path;
    if (p.indexOf('/') != 0) p = '/' + p;

    return process.cwd() + p;
};

module.exports.exists = function(file) {
    var deferred = Q.defer();

    fs.exists(file, function(exists) {
        try {
            return deferred.resolve(exists);
        } catch (ex) {
            return deferred.reject(ex)
        }
    });

    return deferred.promise;
};

module.exports.fileName = function(path) {
    if (path) {
        var start = path.lastIndexOf("/")+1;
        var end = path.length;
        return path.substring(start, end);
    }

    return undefined;
};

/**********************************************************************************************************************
 ** DIRECTORIES
 *********************************************************************************************************************/
module.exports.readDir = function(dir) {
    var deferred = Q.defer();

    fs.readdir(dir, function(err, data) {
        if (err) return deferred.reject(err);

        try {
            return deferred.resolve(data);
        } catch (ex) {
            return deferred.reject(ex)
        }
    });

    return deferred.promise;
};

module.exports.mkdir = function(dir) {
    var deferred = Q.defer();

    mkdirp(dir, function(err, data) {
        if (err) return deferred.reject(err);

        try {
            return deferred.resolve(data);
        } catch (ex) {
            return deferred.reject(ex)
        }
    });

    return deferred.promise;
};

module.exports.rmdir = function(dir) {
    deleteFolderRecursive(dir);

    return Q(dir);
};
var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};


/**********************************************************************************************************************
 ** PLAIN FILES
 *********************************************************************************************************************/

module.exports.readFile = function(file) {
    var deferred = Q.defer();

    fs.readFile(file, {encoding: 'utf8'}, function(err, data) {
        if (err) return deferred.reject(err);

        try {
            return deferred.resolve(data);
        } catch (ex) {
            return deferred.reject(ex)
        }
    });

    return deferred.promise;
};

module.exports.readFileSync = function(file) {
    return fs.readFileSync(file, {encoding: 'utf8'});
};
module.exports.readFileAtOnce = module.exports.readFileSync;

module.exports.writeFileSync = function(file, content) {
    return fs.writeFileSync(file, content, 'utf8');
};

/**********************************************************************************************************************
 ** YAML FILES
 *********************************************************************************************************************/

module.exports.readYamlFile = function(file) {
    return this
        .readFile(file)
        .then(function(content) {
            return yaml.safeLoad(content);
        });
};

module.exports.readYamlFileSync = function(file) {
    return yaml.safeLoad(this.readFileSync(file));
};

module.exports.writeYamlFileSync = function(file, obj) {
    return this.writeFileSync(file, yaml.safeDump(obj));
};

/**********************************************************************************************************************
 ** JSON FILES
 *********************************************************************************************************************/

module.exports.readJsonFileSync = function(file) {
    return JSON.parse(this.readFileSync(file));
};

module.exports.readJsonFile = function(file) {
    return this
        .readFile(file)
        .then(function(content) {
            return JSON.parse(content);
        });
};

module.exports.writeJsonFileSync = function(path, obj) {
    this.writeFileSync(path, JSON.stringify(obj));
};

module.exports.writeJsonFile = function(path, obj) {
    var defer = Q.defer();

    try {
        fs.writeFile(path, JSON.stringify(obj), function (err) {
            return (err) ? defer.reject(err) : defer.resolve(path);
        });
    } catch (error) {
        defer.reject(error);
    }

    return defer.promise;
};

module.exports.jsonFile = module.exports.writeJsonFile;

/**********************************************************************************************************************
 ** INI FILES
 *********************************************************************************************************************/
module.exports.readIniFileSync = function(file) {
    return ini.parse(this.readFileSync(file));
};

module.exports.readIniFile = function(file) {
    return this
        .readFile(file)
        .then(function(content) {
            return ini.parse(content);
        });
};

module.exports.readIniFileSync = function(file) {
    return this
        .readFile(file)
        .then(function(content) {
            return ini.parse(content);
        });
};

module.exports.writeIniFileSync = function(path, obj) {
    this.writeFileSync(path, ini.stringify(obj, { whitespace: true }));
};

module.exports.writeIniFile = function(path, obj) {
    var defer = Q.defer();

    try {
        fs.writeFile(path, ini.stringify(obj, { whitespace: true }), function (err) {
            return (err) ? defer.reject(err) : defer.resolve(path);
        });
    } catch (error) {
        defer.reject(error);
    }

    return defer.promise;
};

module.exports.iniFile = module.exports.writeIniFile;