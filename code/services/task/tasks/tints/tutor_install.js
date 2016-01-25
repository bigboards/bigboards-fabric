var Q = require('q'),
    winston = require('winston'),
    fs = require('fs');

var TaskUtils = require('../../../../utils/task-utils'),
    FsUtils = require('../../../../utils/fs-utils'),
    TintUtils = require('../../../../utils/tint-utils');

module.exports = function(services) {
    return {
        code: 'tutor_install',
        description: 'installing the tutor tint on the hex',
        type: 'ansible',
        parameters: [
            {
                key: 'tint',
                description: 'the tint descriptor',
                required: true
            },
            {
                key: 'verbose',
                description: 'Used to print additional debug information',
                required: false
            }
        ],
        execute: function(env, scope) {
            return services.hex.get().then(function(hex) {
                scope.hex = hex;

                var tintPath = env.settings.dir.tints + '/' + scope.tint.type + '/' + scope.tint.owner + '/' + scope.tint.slug;
                scope.tint.path = tintPath;

                winston.info('Installing tint ' + scope.tint.type + '/' + scope.tint.owner + '/' + scope.tint.slug);

                return services.library.getTint(scope.tint.type, scope.tint.owner, scope.tint.slug)
                    .then(function(ft) {
                        console.log("Update the tint state to 'installing'");
                        scope.tintMeta = ft;
                        scope.tintMeta['state'] = 'partial';

                        return scope;
                    })
                    .then(function(scope) {
                        console.log("Running the tutor install script");
                        return TaskUtils.playbook(env, 'tints/tutor_install', scope);
                    })
                    .then(function() {
                        console.log("Generating the tutorial content");

                        return FsUtils.mkdir(tintPath + '/work').then(function() {
                            return generateTutorialContentList(tintPath, scope.tintMeta.tutor.toc);
                        });
                    })
                    .then(function() {
                        console.log("Changing the tint state to 'installed'");

                        scope.tintMeta['state'] = 'installed';

                        return FsUtils.jsonFile(tintPath + '/meta.json', scope.tintMeta);
                    })
                    .fail(function(error) {
                        console.log("Running the tint post-install script using 'partial' as the outcome because of :\n");
                        console.log(error.message);

                        scope.tintMeta['state'] = 'partial';

                        return FsUtils.jsonFile(tintPath + '/meta.json', scope.tintMeta);
                    });
            });
        }
    };
};

function generateTutorialContentList(tintPath, toc) {
    var promises = [];
    var result = [];

    childrenToList(result, toc, [], tintPath);
    var toc = childrenToToc(toc, []);

    for (var i = 0; i < result.length; i++) {
        if (i > 0) result[i].previous = {
            path: result[i - 1].path,
            title: result[i - 1].title
        };

        if (i < result.length - 1) result[i].next = {
            path: result[i + 1].path,
            title: result[i + 1].title
        };

        // -- write the description to a file
        promises.push(FsUtils.jsonFile(TintUtils.toTutorialElementPath(tintPath + '/work', result[i].path), result[i]));
    }

    promises.push(FsUtils.jsonFile(TintUtils.toTutorialTocPath(tintPath + '/work'), toc));

    return Q.all(promises).then(function() {
        winston.info('Tutorial Content Generated');
    });
}

function childrenToList(list, children, path, tintPath) {
    for (var i = 0; i < children.length; i++) {
        var p = path.slice();
        p.push(i + 1);

        if (children[i].file) {
            list.push({
                path: p,
                title: children[i].title,
                content: FsUtils.readFileAtOnce(tintPath + '/' + children[i].file)
            });
        }

        if (children[i].children && children[i].children.length > 0) {
            childrenToList(list, children[i].children, p, tintPath);
        }
    }
}

function childrenToToc(children, path) {
    var tocItems = [];

    for (var i = 0; i < children.length; i++) {
        var p = path.slice();
        p.push(i + 1);

        var item = {
            path: p,
            title: children[i].title,
            type: (children[i].file) ? 'content' : 'header'
        };

        if (children[i].children && children[i].children.length > 0) {
            item.children = childrenToToc(children[i].children, p);
        }

        tocItems.push(item);
    }

    return tocItems;
}