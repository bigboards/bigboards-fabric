var API = require('../api/api-helper'),
    SettingsService = require('./cluster-settings.service');

module.exports = {
    get: getSettings,
    set: setSettings
};

function getSettings(req, res) {
    API.handle.service(req, res, SettingsService.get());
}

function setSettings(req, res) {
    API.handle.service(req, res, SettingsService.set(req.body));
}

