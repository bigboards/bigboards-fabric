var S = require('string');

module.exports.parse = function(output) {
    var outputLines = S(output).lines();

    var result = [];

    for (var i = 0; i < outputLines.length; i++) {
        var line = S(outputLines[i]);

        if (line.startsWith("PLAY")) {
            result.push({type: 'play', content: line.substring(line.indexOf('[') + 1, line.indexOf(']'))});

        } else if (line.startsWith("TASK")) {
            result.push({type: 'task', content: line.substring(line.indexOf('[') + 1, line.indexOf(']'))});

        } else if (line.startsWith('ok') || line.startsWith('changed') || line.startsWith('unreachable') || line.startsWith('failed')) {
            var status = line.substring(0, line.indexOf(':'));
            var node = line.substring(line.indexOf('[') + 1, line.indexOf(']'));

            result.push({type: 'node', node: node, state: status});
        }
    }

    return result;
};