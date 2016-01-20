var Q = require('q'),
    uuid = require('node-uuid'),
    Errors = require('../../errors'),
    yaml = require("js-yaml"),
    mkdirp = require('mkdirp'),
    fsu = require('../../utils/fs-utils'),
    fs = require('fs'),
    log = require('winston'),
    tu = require('../../utils/tint-utils');

function TutorialService(mmcConfig, services, templater) {
    this.mmcConfig = mmcConfig;
    this.services = services;
    this.templater = templater;

    var self = this;
}

/*********************************************************************************************************************
 * TINTS
 *********************************************************************************************************************/
TutorialService.prototype.listInstalled = function() {
    var self = this;

    var promises = [];

    var typeStat = fs.statSync(self.mmcConfig.dir.tints + '/tutor');
    if (typeStat.isDirectory()) {
        var owners = fs.readdirSync(self.mmcConfig.dir.tints + '/tutor');

        for (var j in owners) {
            var files = fs.readdirSync(self.mmcConfig.dir.tints + '/tutor/' + owners[j]);

            for (var k in files) {
                promises.push(tu.parseManifest(self.services.hex, self.templater, self.mmcConfig.dir.tints, 'tutor', owners[j], files[k]));
            }
        }
    }

    return Q.allSettled(promises).then(function (responses) {
        var result = [];

        for (var i in responses) {
            if (responses[i] != null) {
                result.push(responses[i].value);
            }
        }

        return result;
    });
};

TutorialService.prototype.get = function(owner, slug) {
    return tu.parseManifest(this.services.hex, this.templater, this.mmcConfig.dir.tints, 'tutor', owner, slug);
};

TutorialService.prototype.getToc = function(owner, slug) {
    var resourcePath = tu.toTutorialTocPath(this.mmcConfig.dir.tints + '/tutor/' + owner + '/' + slug + '/work');
    return fsu.readJsonFile(resourcePath);
};

TutorialService.prototype.getPage = function(owner, slug, path) {
    var self = this;

    var resourcePath = tu.toTutorialElementPath(self.mmcConfig.dir.tints + '/tutor/' + owner + '/' + slug + '/work', path);

    return fsu.readJsonFile(resourcePath);
};

TutorialService.prototype.remove = function(tint) {
    return this.services.task.invoke(tint.type + '_uninstall', { tint: tint});
};

module.exports = TutorialService;