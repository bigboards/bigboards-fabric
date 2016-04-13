var kv = require('../store/kv'),
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
    return storage.childKeys('')
    .then(function(nodes) {
        var result = [];

        nodes.forEach(function(node) {
            result.push(new RemoteNode(node.substring('nodes/'.length)));
        });

        return result;
    });
}

function listNodesByExpression(expression) {
    return storage.childKeys('')
        .then(function(nodes) {
            return Expression.nodes(expression, nodes)
                .then(function (nodes) {
                    var result = [];

                    nodes.forEach(function (node) {
                        result.push(new RemoteNode(node.substring('nodes/'.length)));
                    });

                    return result;
                });
        });
}