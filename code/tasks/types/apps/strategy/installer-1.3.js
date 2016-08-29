var settings = require('../../../../settings'),
    kv = require('../../../../store/kv'),
    project = require('../../../../package.json'),
    fsUtils = require('../../../../utils/fs-utils');

var git = require('gift');


module.exports.install = function(app) {
    var unifiedApp = transformApp(app);

    return kv
        .set("apps/" + app.owner + "/" + app.slug, unifiedApp, false, 1)
        .then(function() {
            // -- create the context in which to run the task
            var context = createVariableScope(env, hex, scope);




        });


};

function transformApp(app) {
    var result = {
        services: {
            orphans: {
                name: "The fallback service",
                containers: []
            }
        }
    };

    result.id = app.owner + '/' + app.slug;
    result.name = app.name;
    result.description = app.description;
    result.type = app.type;
    result.scope = app.scope;
    result.configRepo = app.url;
    result.logo = app.logo; // todo: We should download the logo here instead
    result.collaborators = app.collaborators || [];

    result.services.orphans.containers = app.stack.containers;
    result.deployments = app.stack.groups;
    result.views = app.stack.views;

    return result;
}

function createVariableScope(env, hex, scope) {
    var appPath = settings.get("data.dir") + '/' + scope.app.owner + '/' + scope.app.slug;

    // -- build the variables needed during the generation of files
    var variables = {
        hex: {
            id: settings.get("cluster-name"),
            name: settings.get("cluster-name")
        },
        app: scope.app,
        verbose: env.verbose,
        firmware: project.version,
        docker: {
            registry: env.settings.docker.registry
        },
        generator: {
            templates: env.settings.dir.templates
        },
        paths: {
            app: {
                root: appPath,
                git: appPath + "/git",
                ansible: appPath + "/ansible"
            }
        },
        dirs: {
            data: appPath + '/data',
            config: appPath + '/config',
            scripts: appPath + '/scripts'
        }
    };

    // -- the tint is missing a tint id, so we need to add that to it
    //variables.tint.id = TintUtils.toTintId(scope.tint.type, scope.tint.owner, scope.tint.slug);
    variables.hex.node_count = hex.node_count || 6;

    return variables;
}

function createAppStructure(tint, context, registryService) {
    // -- be sure the tint path exists
    fsUtils.mkdir(context.paths.app.root);

    // -- checkout the configuration files from the git repository
    return checkoutIfNeeded(context.app.uri, context.paths.app.git, context.firmware)
        .then(function() {
            generateAnsibleCode(context, registryService);
        });
}

function checkoutIfNeeded(repoUrl, repoPath, firmware) {
    var defer = Q.defer();

    if (fsUtils.exists(repoPath) && !fsUtils.exists(repoPath + "/.git")) fsUtils.rmdir(repoPath);

    if (fsUtils.exists(repoPath)) {
        var repo = git(repoPath);

        repo.pull(function(err) {
            if (err) defer.reject(new Error("Unable to pull the latest version from the git repository: " + err.message));

            defer.resolve(repo);
        })
    } else {
        git.clone(repoUrl, repoPath, function(err, repo) {
            if (err) defer.reject(err);

            // -- try to checkout the branch with the current firmware
            repo.checkout(firmware, function(err) {
                if (err) {
                    defer.resolve(repo);
                } else {
                    repo.checkout(firmware, function(err) {
                        if (err) defer.reject(err);
                        else defer.resolve(repo);
                    });
                }
            });
        });
    }

    return defer.promise;
}

function generateAnsibleCode(context, registryService) {
    var templates = context.generator.templates + '/tint';
    var targetPath = context.paths.app.ansible;
    var roles = context.app.stack.containers;

    // -- make sure the directory in which we will generate the ansible code is available
    fsUtils.mkdir(targetPath);
    fsUtils.mkdir(targetPath + '/roles');

    generateHostsInventoryFile(variables.hex, targetPath + '/hosts');

    fsUtils.generateFile(templates + '/install.yml.j2', targetPath + '/install.yml', context);
    fsUtils.generateFile(templates + '/uninstall.yml.j2', targetPath + '/uninstall.yml', context);

    // -- generate the roles
    roles.forEach(function(container) {
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

    log.log('info', 'processing role ' + JSON.stringify(variables.role));

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