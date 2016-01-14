var ApiUtils = require('../../utils/api-utils'),
    Q = require('q');

function SettingsResource(settingsService) {
    this.settingsService = settingsService;
}

/*********************************************************************************************************************
 * Hex
 *********************************************************************************************************************/

/**
 * @api {get} /api/v1/settings/hex Request Hex settings
 * @apiVersion 1.0.5
 *
 * @apiName GetHexSettings
 * @apiGroup Settings
 * @apiGroupDescription API's to manipulate the settings on the hex
 */
SettingsResource.prototype.getHexSettings = function(req, res) {
    return ApiUtils.handlePromise(res, this.settingsService.getHexSettings(req, res));
};

/*********************************************************************************************************************
 * Client
 *********************************************************************************************************************/

/**
 * @api {get} /api/v1/settings/client Request Client settings
 * @apiVersion 1.0.5
 *
 * @apiName GetClientSettings
 * @apiGroup Settings
 * @apiGroupDescription API's to manipulate the settings on the hex
 */
SettingsResource.prototype.getClientSettings = function(req, res) {
    return ApiUtils.handlePromise(res, this.settingsService.getClientSettings(req, res));
};

module.exports = SettingsResource;
