angular.module('bb.mmc.settings')
    .factory('SettingsService', SettingsService);

SettingsService.$inject = [ 'store' ];

function SettingsService(store) {
    return {
        get: {
            local: getLocalSettings
        }
    };

    function getLocalSettings() {
        return store.get('settings');
    }
}
