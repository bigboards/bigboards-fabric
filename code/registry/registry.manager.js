var Q = require('q'),
    fs = require('fs'),
    log = require('winston'),
    Errors = require('../../errors');

var kv = require('../../store/kv');

module.exports = {
    list: getRegistries,
    get: getRegistry,
    add: addRegistry,
    update: updateRegistry,
    remove: removeRegistry
};

function getRegistry(name) {
    if (! name) throw new Errors.IllegalParameterError("No registry name provided.");

    return kv.get.key('registries/' + name);
}

function getRegistries() {
    return kv.list('registries');
}

// todo: have a look at the error that is thrown here, shouldn't that go with a promise?
function addRegistry(registryData) {
    ["name", "url"].forEach(function(field) {
        if (! registryData[field])
            throw new Errors.IllegalParameterError("No " + field + " field found inside the request body");
    });

    return kv.set('registries/' + registryData.name, registryData);
}

function updateRegistry(name, registryData) {
    return kv.update('registries/' + name, function(data) {
        ["email", "user", "password", "url"].forEach(function(field) {
            if (!registryData.hasOwnProperty(field)) return;

            data[field] = registryData[field];
        });
    });
}

function removeRegistry(name) {
    return kv.remove.key('registries/' + name);
}