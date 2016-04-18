var StringUtils = require('../utils/string-utils'),
    RemoteNode = require('../master/remote-node'),
    Expression = require('../expression'),
    ScopedStorage = require('./storage');

var storage = new ScopedStorage('nodes');

module.exports = {
    nodes: {
        all: listAllNodes,
        byExpression: listNodesByExpression
    }
};

function listAllNodes() {
    return nodes()
        .then(function(nodes) {
            var result = [];

            nodes.forEach(function(node) {
                result.push(new RemoteNode(node));
            });

            return result;
        });
}

function listNodesByExpression(expression) {
    return nodes()
        .then(function(nodes) {
            var resultNodes = Expression.nodes(expression, nodes);

            var result = [];

            resultNodes.forEach(function (node) {
                result.push(new RemoteNode(node));
            });

            return result;
        });
}

function nodes() {
    return storage.childKeys()
        .then(function(nodes) {
            var result = [];

            nodes.forEach(function(node) {
                if (StringUtils.endsWith(node, '/')) return;

                result.push(node);
            });

            return result;
        });
}