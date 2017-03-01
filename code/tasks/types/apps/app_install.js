var Q = require('q'),
    fs = require('fs'),
    fss = require('../../../utils/fs-utils-sync'),
    deepcopy = require('deepcopy'),
    gift = require('gift'),
    errors = require('../../../errors');

var log4js = require('log4js'),
    logger = log4js.getLogger('task.app_install');

module.exports = function(configuration, services) {
    return {
        code: 'app_install',
        description: 'installing the app on the cluster',
        type: 'ansible',
        parameters: [
            {
                key: 'app',
                description: 'the app descriptor',
                required: true
            },
            {
                key: 'verbose',
                description: 'Used to print additional debug information',
                required: false
            }
        ],
        execute: function(env, scope) {
            if (! scope.app.model_version) scope.app.model_version = "1.3";

            if (! fss.exists(__dirname + "/strategy/installer-" + scope.app.model_version + ".js"))
                return Q.reject(new errors.IllegalParameterError("an invalid app model_version was provided"));

            // -- get the installer strategy
            var installer = require('./strategy/installer-' + scope.app.model_version + '.js');

            installer.install(scope.app);


            //var variables = createVariableScope(env, hex, scope);

        //    var defer = Q.defer();
        //
        //    services.hex.get()
        //        .then(function(hex) {
        //            defer.notify({channel: 'output', data: 'Installing tint ' + scope.tint.type + '/' + scope.tint.owner + '/' + scope.tint.slug + '\n'});
        //
        //            var variables = null;
        //
        //            try {
        //                variables = createVariableScope(env, hex, scope);
        //                defer.notify({channel: 'output', data: 'Generated the variable scope \n'});
        //            } catch (error) {
        //                defer.notify({channel: 'error', data: 'Unable to construct the variable scope for installation:\n ' + JSON.stringify(error) + '\n'});
        //                defer.reject();
        //            }
        //
        //            defer.notify({channel: 'output', data: 'Setting up the tint structure \n'});
        //            setupTintStructure(scope.tint, variables, services.registry)
        //                .then(function() {
        //                    defer.notify({channel: 'output', data: 'Tint structure generated \n'});
        //                    var tintEnv = {
        //                        workdir: variables.generator.ansible,
        //                        hostFile: variables.generator.hosts,
        //                        verbose: variables.verbose
        //                    };
        //
        //                    defer.notify({channel: 'output', data: 'Running the installation scripts \n'});
        //                    TaskUtils.playbook(tintEnv, 'install', variables)
        //                        .then(function() {
        //                            defer.notify({channel: 'output', data: 'Installation scripts completed \n'});
        //
        //                            defer.notify({channel: 'output', data: 'Changing the tint state to "installed" \n'});
        //                            TintUtils.setTintState(variables.generator.tint, variables.tint, 'installed')
        //                                .then(function() {
        //                                    defer.notify({channel: 'output', data: 'Tint state set to "installed" \n'});
        //                                    defer.notify({channel: 'output', data: 'The tint has been installed!\n'});
        //                                    defer.resolve();
        //                                }, function(error) {
        //                                    defer.notify({channel: 'error', data: "Unable to change the tint state:\n " + JSON.stringify(error) + "\n"});
        //                                    defer.reject(error);
        //                                });
        //                        }, function(error) {
        //                            defer.notify({channel: 'error', data: "Something went wrong while running the installation scritps:\n " + JSON.stringify(error) + "\n"});
        //                            defer.reject(error);
        //                        }, function(notification) {
        //                            defer.notify(notification);
        //                        });
        //                }, function(error) {
        //                    defer.notify({channel: 'error', data: "Unable to set up the tint structure:\n " + JSON.stringify(error) + "\n"});
        //                    defer.reject(error);
        //                });
        //        }, function(error) {
        //            defer.notify({channel: 'error', data: "Something went wrong while getting the information of the hex:\n " + JSON.stringify(error) + "\n"});
        //            defer.reject(error);
        //        });
        //
        //    return defer.promise;
        }
    };
};

function cleanup(variables) {
    // -- remove the tint directory
    if (variables.generator.tint) fss.rmdir();
}

function setupTintStructure(tint, variables, registryService) {
    // -- be sure the tint path exists
    fss.mkdir(variables.generator.tint);

    // -- write the tint metadata to disk
    tint.state = "installing";
    fss.writeJsonFile(variables.generator.tint + '/meta.json', tint);

    // -- checkout the configuration files from the git repository
    return checkoutIfNeeded(variables.tint.uri, variables.generator.git, variables.firmware).then(function() {
        generateAnsibleCode(variables, registryService);
    });
}

function generateAnsibleCode(variables, registryService) {
    var templateHome = variables.generator.templates + '/tint';

    // -- make sure the directory in which we will generate the ansible code is available
    fss.mkdir(variables.generator.ansible);
    generateHostsInventoryFile(variables.hex, variables.generator.ansible + '/hosts');
    fss.generateFile(templateHome + '/install.yml.j2', variables.generator.ansible + '/install.yml', variables);
    fss.generateFile(templateHome + '/uninstall.yml.j2', variables.generator.ansible + '/uninstall.yml', variables);

    // -- create the directories for the ansible playbook
    fss.mkdir(variables.generator.ansible + '/roles');

    // -- generate the roles
    variables.tint.stack.containers.forEach(function(container) {
        variables.role = container;
        variables.generator.role = variables.generator.ansible + '/roles/' + container.name;
        variables.generator.pre_install = variables.generator.git + '/scripts/' + container.pre_install;
        variables.generator.post_install = variables.generator.git + '/scripts/' + container.post_install;
        variables.dirs.role_data = variables.dirs.data + '/' + container.name;
        variables.dirs.role_scripts = variables.dirs.scripts + '/' + container.name;

        // -- check if the role has a registry set. If it has one, we will look for registry credentials in the hex
        if (container.registry) {
            // -- check if we can find credentials for this registry
            var registry = registryService.getRegistry(container.registry, true);
            if (registry) container.registry = registry;
            else throw new Error('Unable to find a mapping for registry ' +  container.registry);
        }

        // -- substitute the role image with an updated one. In case of bigboards images we append the hex architecture
        if (container.image.indexOf('bigboards/') == 0) {
            container.image = container.image + '-' + variables.hex.arch;
        }

        generateAnsibleRoleCode(variables);
    });
}

/**
 * Generate the ansible role.
 *   This method will generate the tasks, files, templates and scripts directories for the role to use.
 * @param variables
 */
function generateAnsibleRoleCode(variables) {
    var templateHome = variables.generator.templates + '/tint/role';

    logger.info('processing role ' + JSON.stringify(variables.role));

    fss.mkdir(variables.generator.role);

    // -- role tasks
    fss.mkdir(variables.generator.role + '/tasks');
    fss.generateFile(templateHome + '/role_install.yml.j2', variables.generator.role + '/tasks/install.yml', variables);
    fss.generateFile(templateHome + '/role_uninstall.yml.j2', variables.generator.role + '/tasks/uninstall.yml', variables);
    fss.generateFile(templateHome + '/role_main.yml.j2', variables.generator.role + '/tasks/main.yml', variables);

    // -- role files
    fss.mkdir(variables.generator.role + '/files');
    fss.mkdir(variables.generator.role + '/files/init');
    fss.generateFile(templateHome + '/docker-init.conf.j2', variables.generator.role + '/files/init/' + variables.role.name + '.conf', variables);

    if (variables.role.scripts) {
        fss.mkdir(variables.generator.role + '/files/scripts');

        if (variables.role.scripts.on_first_start) {
            fss.generateFile(templateHome + "/on_first_start.sh.j2", variables.generator.role + '/files/scripts/on_first_start.sh', variables);
        }

        if (variables.role.scripts.run) {
            fss.generateFile(templateHome + "/run.sh.j2", variables.generator.role + '/files/scripts/run.sh', variables);
        }
    }

    // -- role templates
    // -- volumes which don't start with a / are relative to the git config directory. This means we will need to
    // -- generate the config files from git into the templates folder
    fss.mkdir(variables.generator.role + '/templates');
    variables.role.volumes.forEach(function(volume) {
        if (! volume.host) return;
        if (volume.host.indexOf('/') == 0) return;
        if (! fss.exists(variables.generator.git + '/config/' + volume.host)) return;

        if (fss.isDirectory(variables.generator.git + '/config/' + volume.host)) {
            fss.mkdir(variables.generator.role + '/templates/' + volume.host);
            fss.generateDir(variables.generator.git + '/config/' + volume.host, variables.generator.role + '/templates/' + volume.host, variables);
        } else {
            // -- create the parent directory
            fss.mkdir(fss.parentFileName(variables.generator.role + '/templates/' + volume.host));
            fss.generateFile(variables.generator.git + '/config/' + volume.host, variables.generator.role + '/templates/' + volume.host, variables);
        }
    });
}

function generateHostsInventoryFile(hex, path) {
    var content = "";

    content += "[first]\n";
    content += hex.name + "-n1	ansible_ssh_user=bb\n\n";

    content += "[last]\n";
    content += hex.name + "-n" + hex.node_count + "	ansible_ssh_user=bb\n\n";

    for (var i = 1; i <= hex.node_count; i++) {
        content += "[n" + i + "]\n";
        content += hex.name + "-n" + i + "	ansible_ssh_user=bb\n\n";
    }

    fss.writeFile(path, content);
}

function checkoutIfNeeded(repoUrl, repoPath, firmware) {
    var defer = Q.defer();

    fss.rmdir(repoPath);

    defer.notify({channel: 'output', data: "Cloning the configuration repository " + repoUrl + " to " + repoPath});

    gift.clone(repoUrl, repoPath, function(err, repo) {
        if (err) defer.reject(err);

        // -- try to checkout the branch with the current firmware
        defer.notify({channel: 'output', data: "Checking if a firmware branch is available for firmware " + firmware + "\n"});
        repo.checkout(firmware, function(err) {
            if (err) {
                defer.notify({channel: 'output', data: "Using the master as configuration branch " + firmware + "\n"});
                defer.resolve(repo);
            } else {
                defer.notify({channel: 'output', data: "Using configuration branch " + firmware + "\n"});

                repo.checkout(firmware, function(err) {
                    if (err) defer.reject(err);
                    else defer.resolve(repo);
                });
            }
        });
    });

    return defer.promise;
}

function createVariableScope(env, hex, scope) {
    var tintPath = env.settings.dir.tints + '/' + scope.tint.type + '/' + scope.tint.owner + '/' + scope.tint.slug;

    // -- build the variables needed during the generation of files
    var variables = {
        hex: deepcopy(hex),
        tint: deepcopy(scope.tint),
        verbose: env.verbose,
        firmware: env.settings.firmware,
        docker: {
            registry: env.settings.docker.registry
        },
        generator: {
            git: tintPath + '/git',
            tint: tintPath,
            ansible: tintPath + '/ansible',
            hosts: tintPath + '/ansible/hosts',
            templates: env.settings.dir.templates
        },
        dirs: {
            data: '/data' + '/' + scope.tint.owner + '_' + scope.tint.slug + '/data',
            config: '/data' + '/' + scope.tint.owner + '_' + scope.tint.slug + '/config',
            scripts: '/data' + '/' + scope.tint.owner + '_' + scope.tint.slug + '/scripts',
        }
    };

    // -- the tint is missing a tint id, so we need to add that to it
    variables.tint.id = TintUtils.toTintId(scope.tint.type, scope.tint.owner, scope.tint.slug);
    variables.hex.node_count = hex.node_count || 6;

    return variables;
}