var ApiUtils = require('../../utils/api-utils'),
    Q = require('q');

function RegistryResource(service) {
    this.service = service;
}

RegistryResource.prototype.getRegistries = function(req, res) {
    return ApiUtils.handlePromise(res, this.service.getRegistries());
};

RegistryResource.prototype.getRegistry = function(req, res) {
    return ApiUtils.handlePromise(res, this.service.getRegistry(req.param('id')));
};

RegistryResource.prototype.addRegistry = function(req, res) {
    return ApiUtils.handlePromise(res, this.service.addRegistry(req.body));
};

RegistryResource.prototype.updateRegistry = function(req, res) {
    return ApiUtils.handlePromise(res, this.service.updateRegistry(req.param('id'), req.body));
};

RegistryResource.prototype.removeRegistry = function(req, res) {
    return ApiUtils.handlePromise(res, this.service.removeRegistry(req.param('id')));
};

module.exports = RegistryResource;
