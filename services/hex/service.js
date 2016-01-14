var Q = require('q'),
    fsu = require('../../utils/fs-utils'),
    tu = require('../../utils/tint-utils'),
    fs = require('fs'),
    log = require('winston'),
    Errors = require('../../errors'),
    jwt = require('jsonwebtoken'),
    https = require('https'),
    auth0 =  require('../../auth0');

function HexService(mmcConfig, hexConfig, templater, services, serf) {
    this.mmcConfig = mmcConfig;
    this.hexConfig = hexConfig;
    this.templater = templater;
    this.services = services;
    this.serf = serf;
    this.nodeCache = [];

    var self = this;

    self._updateNodeList();

    var serfMemberHandler = this.serf.stream('member-join,member-leave,member-update');
    serfMemberHandler.on('data', function(data) {
        if (!data || !data.data || !data.data.Members) return;

        self._updateNodeList();
    });

    fsu.mkdir(this.mmcConfig.dir.tints + '/stack');
    fsu.mkdir(this.mmcConfig.dir.tints + '/dataset');
    fsu.mkdir(this.mmcConfig.dir.tints + '/tutorial');
}

HexService.prototype._updateNodeList = function() {
    var self = this;

    return self.serf.members().then(function(members) {
        var newNodeList = [];

        for ( var idx in members ) {
            var item = members[idx];

            var int_itf = item.Tags['network.internal'];
            var ext_itf = item.Tags['network.external'];

            newNodeList.push({
                name: item.Name,
                status: item.Status,
                role: item.Tags['role'],
                arch: item.Tags['arch'],
                hex_id: item.Tags['hex-id'],
                network: {
                    internal: {
                        itf: int_itf,
                        ip: item.Tags['network.' + int_itf + '.ip'],
                        mac: item.Tags['network.' + int_itf + '.mac'],
                        netmask: item.Tags['network.' + int_itf + '.netmask'],
                        broadcast: item.Tags['network.' + int_itf + '.broadcast']
                    },
                    external: {
                        itf: ext_itf,
                        ip: item.Tags['network.' + ext_itf + '.ip'],
                        mac: item.Tags['network.' + ext_itf + '.mac'],
                        netmask: item.Tags['network.' + ext_itf + '.netmask'],
                        broadcast: item.Tags['network.' + ext_itf + '.broadcast']
                    }
                }
            });
        }

        self.nodeCache = newNodeList;

        return newNodeList;
    });
};

HexService.prototype.get = function() {
    return Q(this.hexConfig.all());
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
    var self = this;

    // -- link the device to the profile. We can do this by calling auth0 and adding it to the metadata. I think we
    // -- should make use of a dedicated api from auth0 for this but I don't find any documentation about that yet.
    // -- look at https://github.com/auth0/docs/issues/416 for that.
    var metadata = {
        hexes: {}
    };

    metadata.hexes[this.hexConfig.get('id')] = {
        name: this.hexConfig.get('name'),
        architecture: this.hexConfig.get('arch')
    };

    return auth0.user.updateMetadata(token, metadata)
        .then(function(profile) {

            var hiveToken = jwt.decode(token).hive_token;
            var decodedToken = jwt.decode(hiveToken);

            // -- save the profile to the local storage. Also save the hive token
            self.hexConfig.set([
                { key: 'hive.token', value: hiveToken },
                { key: 'hive.user.id', value: decodedToken.hive_id },
                { key: 'hive.user.name', value: profile.name },
                { key: 'hive.user.email', value: profile.email },
                { key: 'hive.user.picture', value: profile.picture }
            ])
        });
};

HexService.prototype.unlink = function() {
    var self = this;

    // -- link the device to the profile. We can do this by calling auth0 and adding it to the metadata. I think we
    // -- should make use of a dedicated api from auth0 for this but I don't find any documentation about that yet.
    // -- look at https://github.com/auth0/docs/issues/416 for that.
    var token = this.hexConfig.get('hive.token');

    var metadata = {
        hexes: {}
    };

    metadata.hexes[this.hexConfig.get('id')] = null;

    // TODO: This needs to be implemented the correct way.
    //return auth0.user.get(token).then(function(profile) {
    //    delete profile.app_metadata.hexes[self.hexConfig.get('id')];

        //return auth0.user.updateMetadata(token, profile.app_metadata)
        //    .then(function(profile) {
                //return auth0.token.blacklist(token).then(function() {
                return Q(self.hexConfig.remove(['hive.token', 'hive.user.id', 'hive.user.name', 'hive.user.email', 'hive.user.picture']));
                //});
            //});
    //});
};

/*********************************************************************************************************************
 * NODES
 *********************************************************************************************************************/
HexService.prototype.listNodes = function() {
    return Q(this.nodeCache);
};

HexService.prototype.addNode = function(node) {
    var idx = indexForNode(this.nodeCache, node);

    if (idx == -1) {
        this.nodeCache.push(node);
        log.info('Added node ' + node.Name);
    } else {
        this.updateNode(node);
        log.info('Updated node ' + node.Name);
    }
};

HexService.prototype.updateNode = function(node) {
    this.nodeCache[indexForNode(this.nodeCache, node)] = node;
    log.info('Updated node ' + node.Name);
};

HexService.prototype.removeNode = function(node) {
    delete this.nodeCache[indexForNode(this.nodeCache, node)];
    log.info('Removed node ' + node.Name);
};

/*********************************************************************************************************************
 * TINTS
 *********************************************************************************************************************/
HexService.prototype.listTints = function() {
    var self = this;
    var metafile = this.mmcConfig.dir.tints + '/meta.json';

    return fsu.exists(metafile).then(function(exists) {
        if (exists) {
            return fsu.readJsonFile(metafile).then(function(metadata) {
                return self.listNodes().then(function(nodes) {
                    var scope = self.templater.createScope(nodes);

                    return self.templater.templateWithScope(metadata, scope);
                });
            });
        } else {
            return {};
        }
    });
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
        return self.services.task.invoke(type + '_uninstall', { tint: tint });
    });
};

HexService.prototype.installTint = function(tint) {
    var self = this;

    var id = tu.toTintId(tint.type, tint.owner, tint.slug);

    return this.listTints().then(function(installedTints) {
        return self.services.task.current().then(function(currentTask) {
            if (currentTask) {
                throw new Errors.TaskAlreadyStartedError('An task is already running. Wait for it to complete before installing the tint');
            } else {
                for (var param in installedTints) {
                    if (!installedTints.hasOwnProperty(param)) continue;

                    // -- ignore the same tint if it is already installed. That would allow us to reinstall it.
                    if (param == id) continue;

                    // -- ignore if the tint to install is not a stack. Only stacks can be installed one at the time
                    if (tint.type != 'stack') continue;

                    // -- ignore stacks
                    if (installedTints[param].type != 'stack') continue;

                    throw new Errors.TintInstallationError('A stack tint has already been installed. Remove it first before trying to install a new one.');
                }

                return self.services.task.invoke(tint.type + '_install', { tint: tint });
            }
        });
    });
};

function indexForNode(nodeList, node) {
    // -- discover the index of the node
    for (var idx in nodeList) {
        if (node.name == nodeList[idx].name) {
            return idx;
        }
    }

    return -1;
}

module.exports = HexService;