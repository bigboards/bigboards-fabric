var Q = require('q'),
    fs = require('fs'),
    log = require('winston'),
    Errors = require('../../errors');

var kv = require('../../kv');

function RegistryService(mmcConfig) {
    this.mmcConfig = mmcConfig;
}

RegistryService.prototype.getRegistries = function() {
    return kv.list('registries');
};

RegistryService.prototype.getRegistry = function(name, sync) {
    if (! name) throw new Errors.IllegalParameterError("No registry name provided.");

    return kv.get('registries/' + name);
};

RegistryService.prototype.addRegistry = function(registryData) {
    ["name", "email", "user", "password"].forEach(function(field) {
        if (! registryData[field])
            throw new Errors.IllegalParameterError("No " + field + " field found inside the request body");
    });

    return kv.set('registries/' + registryData.name, registryData);
};

RegistryService.prototype.updateRegistry = function(name, registryData) {
    return kv.update('registries/' + name, function(data) {
        ["email", "user", "password"].forEach(function(field) {
            if (!registryData.hasOwnProperty(field)) return;

            data[field] = registryData[field];
        });
    });
};

RegistryService.prototype.removeRegistry = function(name) {
    return kv.remove('registries/' + name);
};

module.exports = RegistryService;