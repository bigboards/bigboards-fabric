var TaskUtils = require('../../../utils/task-utils');

module.exports = function(configuration) {
    return {
        code: 'network_internal',
        description: 'change the ip range for the internal network',
        type: 'ansible',
        parameters: [
            {
                key: 'ip_prefix',
                description: 'The ip prefix to use for the addresses. This is a string in the form of xxx.xxx.xxx and is used to prepend to the node sequence',
                required: true
            },
            {
                key: 'verbose',
                description: 'Used to print additional debug information',
                required: false
            }
        ],
        execute: function (env, scope) {
            return TaskUtils
                .playbook(env, 'network/network-internal', scope)
                .then(function(data) {
                    return {msg: 'Please disconnect and reconnect the power to the hex to fixate the internal changes.'};
                });
        }
    }
};