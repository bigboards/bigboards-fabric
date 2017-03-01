module.exports = {
    evaluate: evaluate
};

function evaluate(expression, nodes) {
    var result = [];

    // TODO: make sure expression only contains safe characters
    nodes.forEach(function(node) {
        var nodeContext = node.Meta || {};
        nodeContext.hostname = node.Node;

        // -- check if the node matches the expression
        var outcome = function(str){
            return eval(str);
        }.call(nodeContext, expression);

        if (outcome)
            result.push(node.ID);
    });

    return result;
}