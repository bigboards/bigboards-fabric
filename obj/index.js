var fs = require('fs'),
    fss = require('../utils/fs-utils-sync'),
    log = require('winston');

function ObjectStore(file) {
    this.file = file;

    var self = this;

    // -- check if the file exists
    if (! fss.exists(file)) {
        log.log('info', 'Creating an empty object store at ' + file);
        fss.writeYamlFile(file, {});
    }
    self.reload();
}

ObjectStore.prototype.reload = function() {
    try {
        this.cache = fss.readYamlFile(this.file);
        log.log('info', 'Loaded the object store from ' + this.file);
    } catch (error) {
        throw new Error('Unable to parse the contents of the ' + this.file + ' file into an object store: ' + error.message);
    }
};

ObjectStore.prototype.set = function(key, value) {
    this.cache[key] = value;

    persist(this.file, this.cache);
};

ObjectStore.prototype.get = function(key) {
    return this.cache[key];
};

ObjectStore.prototype.remove = function(key) {
    var self = this;

    delete this.cache[key];

    persist(this.file, this.cache);
};

ObjectStore.prototype.list = function(prefix) {
    var result = {};

    for (var k in this.cache) {
        if (! this.cache.hasOwnProperty(k)) continue;

        if (k.indexOf(prefix) == 0) {
            result[k] = this.cache[k];
        }
    }

    return result;
};

ObjectStore.prototype.all = function() {
    return this.cache;
};

module.exports = ObjectStore;

function persist(path, contents) {
    fss.writeYamlFile(path, contents);
    log.debug('ObjectStore persisted to disk!');
}