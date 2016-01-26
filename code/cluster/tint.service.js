var Q = require('q'),
    kv = require('../store/kv'),
    catalog = require('../store/catalog'),
    health = require('../store/health'),
    log4js = require('log4js');

var logger = log4js.getLogger('service.tint');

module.exports = {
    list: listTints,
    get: getTint,
    install: installTint,
    uninstall: uninstallTint
};

function installTint(definition) {
    return kv.set('tints/' + definition.owner + '$' + definition.slug, definition, null, 0);
}

function uninstallTint(profileId, slug) {
    return kv.flag('tints/' + profileId + '$' + slug, 999);
}

function listTints() {
    return kv.list('tints').then(function(tintPaths) {
        var promises = [];

        tintPaths.forEach(function(tintPath) {
            promises.push(_getTintListItem(tintPath));
        });

        return Q.all(promises);
    });
}

function getTint(profileId, slug) {
    return _getExtendedNodeDetail('tints/' + profileId + '$' + slug);
}

function _getTintListItem(tintPath) {
    return _getExtendedTintDetail(tintPath).then(function(tint) {
        delete tint.stack;

        return tint;
    });
}

function _getExtendedTintDetail(tintPath) {
    return Q.all([
        kv.get.key(tintPath)
    ]).then(function(results) {
        var result = results[0];

        return result;
    });
}