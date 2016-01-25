var Q = require('q'),
    fsu = require('../../utils/fs-utils'),
    tu = require('../../utils/tint-utils'),
    fs = require('fs'),
    log = require('winston'),
    Errors = require('../../errors'),
    jwt = require('jsonwebtoken'),
    https = require('https'),
    auth0 =  require('../../auth0');


var tintManager = require('../../tint/tint.manager');
var consul = require('consul')();

function HexService(mmcConfig, templater, services, consul) {
    this.mmcConfig = mmcConfig;
    this.templater = templater;
    this.services = services;

    fsu.mkdir(this.mmcConfig.dir.tints + '/stack');
    fsu.mkdir(this.mmcConfig.dir.tints + '/dataset');
    fsu.mkdir(this.mmcConfig.dir.tints + '/tutorial');
}

HexService.prototype.get = function() {
    var defer = Q.defer();

    consul.kv.get.key('hex', function(err, result) {
        if (err) return defer.reject(err);
        defer.resolve((result) ? JSON.parse(result.Value) : {});
    });

    return defer.promise;
};

HexService.prototype.powerdown = function() {
    return this.services.task.invoke('halt', { });
};

/*********************************************************************************************************************
 * LINK
 *********************************************************************************************************************/

/**
 * Link a hex to a user.
 *
 * @param token the token used for authenticating and identifying the user to which to link the hex.
 */
HexService.prototype.link = function(token) {
    var hiveToken = jwt.decode(token).hive_token;
    var decodedToken = jwt.decode(hiveToken);

    var data = {
        token: hiveToken,
        user: {
            id: decodedToken.hive_id,
            name: decodedToken.name,
            email: decodedToken.email,
            picture: decodedToken.picture
        }
    };

    var defer = Q.defer();

    consul.kv.set('hex', JSON.stringify(data, null, 2), function(err, result) {
        if (err) return defer.reject(err);
        defer.resolve(result);
    });

    return defer.promise;
};

HexService.prototype.unlink = function() {
    var defer = Q.defer();

    consul.kv.del('hex', function(err, result) {
        if (err) return defer.reject(err);
        defer.resolve(result);
    });

    return defer.promise;
};

/*********************************************************************************************************************
 * NODES
 *********************************************************************************************************************/
HexService.prototype.listNodes = function() {
    var defer = Q.defer();

    consul.catalog.node.list(function(err, result) {
        if (err) return defer.reject(err);

        var res = [];

        result.forEach(function(n) {
            res.push({node: n.Node, address: n.Address});
        });

        return defer.resolve(res);
    });

    return defer.promise;
};

/*********************************************************************************************************************
 * TINTS
 *********************************************************************************************************************/
HexService.prototype.listTints = function() {
    var self = this;
    var metafile = this.mmcConfig.dir.tints + '/meta.json';

    var exists = fsu.exists(metafile);
    if (exists) {
        return Q(fsu.readJsonFile(metafile).then(function(metadata) {
            return self.listNodes().then(function(nodes) {
                var scope = self.templater.createScope(nodes);

                return self.templater.templateWithScope(metadata, scope);
            });
        }));
    } else {
        return Q({});
    }
};

HexService.prototype.getTint = function(type, owner, slug) {
    var self = this;
    var metafile = self.mmcConfig.dir.tints + '/meta.json';

    return fsu.exists(metafile).then(function(exists) {
        if (exists) {
            return fsu.readJsonFile(metafile).then(function(metadata) {
                return self.listNodes().then(function(nodes) {
                    var scope = self.templater.createScope(nodes);

                    return self.templater.templateWithScope(metadata[tu.toTintId(type, owner, slug)], scope);
                });
            });
        } else {
            return {};
        }
    });
};

HexService.prototype.getTintResource = function(type, owner, tint, resource) {
    var resourcePath = this.mmcConfig.dir.tints + '/' + type + '/' + owner + '/' + tint + '/' + resource;
    return fsu.exists(resourcePath).then(function(exists) {
        if (exists) {
            return fsu.readFile(resourcePath);
        } else {
            return Q.fail('No such file or directory: ' + resourcePath);
        }
    })
};

HexService.prototype.removeTint = function(type, owner, slug) {
    var self = this;

    return this.getTint(type, owner, slug).then(function(tint) {
        return tintManager.uninstall(tint);
    });
};

HexService.prototype.installTint = function(tint) {
    return tintManager.install(tint);
};

module.exports = HexService;