var Q = require('q'),
    TaskUtils = require('../../../../utils/task-utils');

module.exports = function() {
    return {
        code: 'dummy',
        description: 'Perform a dummy task',
        type: 'ansible',
        parameters: [
            {
                key: 'loops',
                description: 'The number of 1 sec loops',
                required: false
            }
        ],
        execute: function (env, scope) {
            return TaskUtils.playbook(env, 'dummy/dummy', scope);
        }
    }
};
