var Q = require('q'),
    winston = require('winston');

var TaskUtils = require('../../../../utils/task-utils');

module.exports = function() {
    return {
        code: 'halt',
        description: 'prepare the hex for shutdown',
        type: 'ansible',
        parameters: [
            {
                key: 'verbose',
                description: 'Used to print additional debug information',
                required: false
            }
        ],
        execute: function(env, scope) {
            return TaskUtils.playbook(env, 'system/halt', scope);
        }
    };
};
