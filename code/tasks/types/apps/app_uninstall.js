var deepcopy = require('deepcopy'),
    fss = require('../../../utils/fs-utils-sync');

var TaskUtils = require('../../../utils/task-utils');

module.exports = function(configuration, services) {
    return {
        code: 'stack_uninstall',
        description: 'removing the tint from the hex',
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
            //var tintPath = env.settings.dir.tints + '/' + scope.tint.type + '/' + scope.tint.owner + '/' + scope.tint.slug;
            //var metadata = deepcopy(scope.tint);
            //
            //return services.hex.get()
            //    .then(function(hex) {
            //        scope.hex = hex;
            //
            //        return TintUtils
            //            .setTintState(tintPath, metadata, 'uninstalling')
            //            .then(function() {
            //                var tintEnv = {
            //                    workdir: tintPath + '/ansible',
            //                    hostFile: 'hosts',
            //                    verbose: env.verbose
            //                };
            //
            //                return TaskUtils.playbook(tintEnv, 'uninstall', scope);
            //            });
            //    })
            //    .then(function() {
            //        return TaskUtils.removeFile(tintPath).then(function() {
            //            if (fss.readDir(env.settings.dir.tints + '/' + scope.tint.type + '/' + scope.tint.owner).length == 0)
            //                fss.rmdir(env.settings.dir.tints + '/' + scope.tint.type + '/' + scope.tint.owner);
            //        });
            //    });

        }
    };
};
