var fsu = require('./fs-utils');

module.exports.id = function(app) {
    return app.profile.id + '-' + app.slug;
    //return app.owner + '$' + app.slug;
};

module.exports.parseManifest = function(hexService, templater, appRoot, type, owner, slug) {
    var appDir = appRoot + '/' + type + '/' + owner + '/' + slug;

    return fsu.readYamlFile(appDir + '/app.yml').then(function(content) {
        return hexService.listNodes().then(function(nodes) {
            return templater.createScope(nodes).then(function(scope) {
                return templater.templateWithScope(content, scope);
            });
        }).fail(function(error) {
            console.log('unable to parse the app meta file: ' + error.message);
        });
    });
};

module.exports.toTutorialElementPath = function(generationPath, path) {
    return generationPath + '/' + path.join('_') + '.bbt'
};

module.exports.toTutorialTocPath = function(generationPath) {
    return generationPath + '/toc.bbt'
};

module.exports.toAppId = function(type, owner, slug) {
    return '[' + type + ']' + owner + '$' + slug;
};

module.exports.setAppState = function(metadataPath, metadata, newState) {
    metadata.state = newState;
    var metadataFile = metadataPath + '/meta.json';

    var appId = module.exports.toAppId(metadata.type, metadata.owner, metadata.slug);

    return fsu.exists(metadataFile).then(function(exists) {
        if (exists && installedApps) {
            return fsu.readJsonFile(metadataFile).then(function(installedApps) {
                installedApps[appId] = metadata;

                return fsu.jsonFile(metadataFile, installedApps).then(function() {
                    console.log('updated the apps state for ' + appId + ' to ' + newState + ' into ' + metadataFile);
                });
            });
        } else {
            var installedApps = {};
            installedApps[appId] = metadata;

            return fsu.jsonFile(metadataFile, installedApps).then(function() {
                console.log('created the apps state for ' + appId + ' as ' + newState + ' into ' + metadataFile);
            });
        }
    });
};

module.exports.removeAppState = function(metadataPath, metadata) {
    console.log('removed the apps state for ' + metadata.id);
    var metadataFile = metadataPath + '/meta.json';

    return fsu.exists(metadataFile).then(function(exists) {
        if (exists) {
            return fsu.readJsonFile(metadataFile).then(function(installedApps) {
                var remainingApps = [];

                Object.keys(installedApps).forEach(function(property) {
                    if (! installedApps.hasOwnProperty(property)) return;

                    if (property != metadata.id)
                        remainingApps[property] = installedApps[property];
                });

                return fsu.jsonFile(metadataFile, remainingApps);
            });
        }
    });


};