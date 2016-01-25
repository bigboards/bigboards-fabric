var fsu = require('./fs-utils');

module.exports.id = function(tint) {
    return tint.owner + '$' + tint.slug;
};

module.exports.parseManifest = function(hexService, templater, tintRoot, type, owner, slug) {
    var tintDir = tintRoot + '/' + type + '/' + owner + '/' + slug;

    return fsu.readYamlFile(tintDir + '/tint.yml').then(function(content) {
        return hexService.listNodes().then(function(nodes) {
            return templater.createScope(nodes).then(function(scope) {
                return templater.templateWithScope(content, scope);
            });
        }).fail(function(error) {
            console.log('unable to parse the tint meta file: ' + error.message);
        });
    });
};

module.exports.toTutorialElementPath = function(generationPath, path) {
    return generationPath + '/' + path.join('_') + '.bbt'
};

module.exports.toTutorialTocPath = function(generationPath) {
    return generationPath + '/toc.bbt'
};

module.exports.toTintId = function(type, owner, slug) {
    return '[' + type + ']' + owner + '$' + slug;
};

module.exports.setTintState = function(metadataPath, metadata, newState) {
    metadata.state = newState;
    var metadataFile = metadataPath + '/meta.json';

    var tintId = module.exports.toTintId(metadata.type, metadata.owner, metadata.slug);

    return fsu.exists(metadataFile).then(function(exists) {
        if (exists && installedTints) {
            return fsu.readJsonFile(metadataFile).then(function(installedTints) {
                installedTints[tintId] = metadata;

                return fsu.jsonFile(metadataFile, installedTints).then(function() {
                    console.log('updated the tints state for ' + tintId + ' to ' + newState + ' into ' + metadataFile);
                });
            });
        } else {
            var installedTints = {};
            installedTints[tintId] = metadata;

            return fsu.jsonFile(metadataFile, installedTints).then(function() {
                console.log('created the tints state for ' + tintId + ' as ' + newState + ' into ' + metadataFile);
            });
        }
    });
};

module.exports.removeTintState = function(metadataPath, metadata) {
    console.log('removed the tints state for ' + metadata.id);
    var metadataFile = metadataPath + '/meta.json';

    return fsu.exists(metadataFile).then(function(exists) {
        if (exists) {
            return fsu.readJsonFile(metadataFile).then(function(installedTints) {
                var remainingTints = [];

                Object.keys(installedTints).forEach(function(property) {
                    if (! installedTints.hasOwnProperty(property)) return;

                    if (property != metadata.id)
                        remainingTints[property] = installedTints[property];
                });

                return fsu.jsonFile(metadataFile, remainingTints);
            });
        }
    });


};