var kv = require('../store/kv'),
    tu = require('../utils/tint-utils');

module.exports = {
    install: install,
    uninstall: uninstall
};

function install(tint) {
    var tintId = tu.id(tint);
    return kv.set('tints/' + tint.type + '/' + tintId, tint, null, 0);
}

function uninstall(tint) {
    var tintId = tu.id(tint);
    return kv.flag('tints/' + tint.type + '/' + tintId, 999);
}