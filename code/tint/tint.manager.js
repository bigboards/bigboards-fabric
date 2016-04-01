var kv = require('../store/kv'),
    events = requre('../store/events'),
    eventNames = require('../event_names'),
    tu = require('../utils/tint-utils');

module.exports = {
    install: install,
    uninstall: uninstall
};

function install(tint) {
    var tintId = tu.id(tint);
    return kv.set('tints/' + tint.type + '/' + tintId, tint, null, 0).then(function() {
        events.fire(eventNames.TINT_INSTALL_PENDING, {
            tint: tintId
        });
    });
}

function uninstall(tint) {
    var tintId = tu.id(tint);
    return kv.flag('tints/' + tint.type + '/' + tintId, 999).then(function() {
        events.fire(eventNames.TINT_UNINSTALL_PENDING, {
            tint: tintId
        });
    })
}