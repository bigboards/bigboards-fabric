var Q = require('q'),
    winston = require('winston');

var TaskUtils = require('../../../../utils/task-utils');

module.exports = function(configuration, services) {
    return {
        code: 'tutor_uninstall',
        description: 'removing the tutor tint from the hex',
        type: 'ansible',
        parameters: [
            {
                key: 'tint',
                description: 'The tint',
                required: true
            },
            {
                key: 'verbose',
                description: 'Used to print additional debug information',
                required: false
            }
        ],
        execute: function(env, scope) {
            return services.hex.get()
                .then(function(hex) {
                    scope.hex = hex;
                })
                .then(function() {
                    return services.library.getTint(scope.tint.type, scope.tint.owner, scope.tint.slug);
                })
                .then(function(ft) {
                    console.log("Update the tint state to 'partial'");
                    scope.tintMeta = ft;
                    scope.tintMeta['state'] = 'partial';

                    return scope;
                })
                .then(function() {
                    return TaskUtils.removeFile(env.settings.dir.tints + '/' + scope.tint.type + '/' + scope.tint.owner + '/' + scope.tint.slug);
                });

        }
    };
};
