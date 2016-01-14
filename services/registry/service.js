var Q = require('q'),
    fs = require('fs'),
    log = require('winston'),
    Errors = require('../../errors');

function RegistryService(mmcConfig, hexConfig, registryStore) {
    this.mmcConfig = mmcConfig;
    this.hexConfig = hexConfig;
    this.store = registryStore;
}

RegistryService.prototype.getRegistries = function() {
    return Q(this.store.all());
};

RegistryService.prototype.getRegistry = function(name, sync) {
    if (! name) throw new Errors.IllegalParameterError("No registry name provided.");

    return (sync) ? this.store.get(name) : Q(this.store.get(name));
};

RegistryService.prototype.addRegistry = function(registryData) {
    ["name", "email", "user", "password"].forEach(function(field) {
        if (! registryData[field])
            throw new Errors.IllegalParameterError("No " + field + " field found inside the request body");
    });

    this.store.set(registryData.name, registryData);

    return Q(this.store.get(registryData.name));
};

RegistryService.prototype.updateRegistry = function(name, registryData) {
    if (! this.store.hasOwnProperty(name)) throw new Errors.NotFoundError("No registry named '" + name + "' found.");

    var self = this;
    var obj = self.store.get(name);

    ["email", "user", "password"].forEach(function(field) {
        if (!registryData.hasOwnProperty(field)) return;

        obj[field] = registryData[field];
    });

    this.store.set(name, obj);

    return Q(obj);
};

RegistryService.prototype.removeRegistry = function(name) {
    this.store.remove(name);
};

module.exports = RegistryService;