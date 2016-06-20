var kv = require('../store/kv'),
    tu = require('../utils/app-utils'),
    log4js = require('log4js'),
    Q = require('q');

var logger = log4js.getLogger('tmp');

var app = { profile: { id: "google-oauth2-103728492012393057640" }, slug: "elasticsearch"};


kv.list({key: 'nodes/', separator: '/'}).then(function(nodes) {
    var promises = [];

    nodes.forEach(function(node) {
        logger.debug('processing node');

        if (node.lastIndexOf('/') == node.length - 1) {
            promises.push(kv.multiflag(node + 'daemons/' + tu.id(app), 999));
        }
    });

    return Q.all(promises);
}).fail(function(error) {
    logger.error(error);
});