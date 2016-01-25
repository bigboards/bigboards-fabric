var catalog = require('../store/catalog');

module.exports = {
    nodes: parseNodes
};

function parseNodes(expression) {
    var filters = expressionToFilters(expression);

    return catalog.nodes().then(function(nodes) {
        var result = nodes;

        filters.forEach(function(filter) {
            result = filter(result);
        });

        return result;
    });
}

function expressionToFilters(expression) {
    var parts = expression.split(':');

    var res = [];
    parts.forEach(function(part) {
        part = part.trim();

        if (part.toLowerCase() == 'all') res.push(filters.all);
        else if (part.indexOf('!') == 0) res.push(filters.id.not(part.substring(1)));
        else res.push(filters.id.must(part));
    });

    return res;
}


var filters = {
    all: function(nodes) { return nodes },
    id: {
        must: _idMustMatchFilter,
        not: _idMustNotMatchFilter
    }
};

function _idMustMatchFilter(expression) {
    var regex = new RegExp(expression);

    return function(nodes) {
        nodes.forEach(function(node) {
            if (!node.hostname.match(regex))
                nodes.splice(nodes.indexOf(node));
        });

        return nodes;
    };
}

function _idMustNotMatchFilter(expression) {
    var regex = new RegExp(expression);

    return function(nodes) {
        nodes.forEach(function(node) {
            if (node.hostname.match(regex))
                nodes.splice(nodes.indexOf(node));
        });

        return nodes;
    };
}