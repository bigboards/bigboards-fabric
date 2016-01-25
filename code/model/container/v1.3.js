module.exports =  function(definition) {
    var result = {
        "Image": definition.image,
        "Hostname": definition.name,
        "ArchitectureAware": definition.architectureAware,
        "HostConfig": {
            PublishAllPorts: true
        }
    };

    if (definition.registry) result.Image = definition.registry + '/' + result.Image;
    if (definition.networking) result.HostConfig.NetworkMode = definition.networking;
    if (definition.command) result.Cmd = [ definition.command ];

    if (definition.environment) {
        result.Env = [];

        definition.environment.forEach(function(mapping) {
            result.Env.push(mapping.key + '=' + mapping.value);
        })
    }

    if (definition.volumes) {
        result.Mounts = [];
        definition.volumes.forEach(function(mapping) {
            result.Mounts.push({
                Source: mapping.host,
                Destination: mapping.container
            });
        });
    }

    if (definition.ports) {
        result.HostConfig.PortBindings = {};
        definition.ports.forEach(function(portMapping) {
            result.HostConfig.PortBindings[portMapping.container + '/tcp'] = [{HostPort: portMapping.host}];
        });
    }

    if (definition.volumes_from) {
        result.HostConfig.VolumesFrom = [];
        definition.volumes_from.forEach(function(mapping) {
            result.HostConfig.VolumesFrom.push(mapping);
        });
    }

    if (definition.links) {
        result.HostConfig.Links = [];
        definition.links.forEach(function(link) {
            result.HostConfig.Links.push(link);
        });
    }

    return result;
};