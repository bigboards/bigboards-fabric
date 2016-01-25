module.exports =  function(definition) {
    var result = {
        "Hostname": definition.hostname,
        "Domainname": definition.domainname,
        "User": definition.user,
        "Entrypoint": definition.entrypoint,
        "Image": definition.image,
        "WorkingDir": definition.workingDir,
        "HostConfig": {}
    };

    if (definition.io) {
        result.AttachStdin =  definition.io.attachStdin || false;
        result.AttachStdout = definition.io.attachStdout || true;
        result.AttachStderr = definition.io.attachStderr || true;
        result.Tty = definition.io.tty || false;
        result.OpenStdin = definition.io.openStdin || false;
        result.StdinOnce = definition.io.stdinOnce || false;
    }

    if (definition.volumes) {
        result.Mounts = [];
        definition.volumes.forEach(function(mapping) {
            var volume = {
                Source: mapping.host,
                Destination: mapping.container
            };

            if (mapping.mode) volume.Mode = mapping.mode;
            if (mapping.rw) volume.RW = mapping.rw;

            result.Mounts.push(volume);
        });
    }

    if (definition.volumes_from) {
        result.HostConfig.VolumesFrom = [];
        definition.volumes_from.forEach(function(mapping) {
            var m = mapping.container;
            if (mapping.mode) m += (':' + mapping.mode);

            result.HostConfig.VolumesFrom.push(m);
        });
    }

    if (definition.links) {
        result.HostConfig.Links = [];
        definition.links.forEach(function(link) {
            var l = link.container;
            if (link.alias) l += (':' + link.alias);

            result.HostConfig.Links.push(l);
        });
    }

    if (definition.command) {
        result.Cmd = [ definition.command ];
    }

    if (definition.environment) {
        result.Env = [];

        definition.environment.forEach(function(mapping) {
            result.Env.push(mapping.key + '=' + mapping.value);
        })
    }

    if (definition.logging) {
        result.HostConfig.LogConfig = {
            Type: definition.logging.type || 'json-file',
            Config: definition.logging.config
        };
    }

    if (definition.restart) {
        result.HostConfig.RestartPolicy = {
            Name: definition.restart.name,
            MaximumRetryCount: definition.restart.maxRetryCount || 0
        };
    }

    if (definition.ports) {
        result.ExposedPorts = {};
        definition.ports.forEach(function(portMapping) {
            var protocol = portMapping.protocol || 'tcp';

            result.HostConfig.PortBindings[portMapping.container + '/' + protocol] = [{HostPort: portMapping.host}];

            if (portMapping.exposed) {
                result.ExposedPorts[portMapping.container + '/' + protocol] = {};
            }
        });
    }

    if (definition.resources) {
        result.HostConfig.OomKillDisable = definition.resources.oomKillDisable || false;

        if (definition.resources.memory) {
            result.HostConfig.Memory = definition.resources.memory.total || 0;
            result.HostConfig.MemorySwap = definition.resources.memory.swap || 0;
            result.HostConfig.MemorySwappiness = definition.resources.memory.swappiness || 60;
        }

        if (definition.resources.cpu) {
            result.HostConfig.CpuShares = definition.resources.cpu.shares || 512;
            result.HostConfig.CpuPeriod = definition.resources.cpu.period || 100000;
            result.HostConfig.CpuQuota = definition.resources.cpu.quota || 50000;

            if (definition.resources.cpu.set) {
                result.HostConfig.CpusetCpus = definition.resources.cpu.set.cpus || '0, 1';
                result.HostConfig.CpusetMems = definition.resources.cpu.set.mems || '0, 1';
            }
        }

        if (definition.resources.io) {
            result.HostConfig.BlkioWeight = definition.resources.io.weight || 300;

            if (definition.resources.io.ulimits) {
                result.HostConfig.Ulimits = [];
                definition.resources.io.ulimits.forEach(function(limit) {
                    result.HostConfig.Ulimits.push({Name: limit.name, Soft: limit.soft, Hard: limit.hard});
                });
            }
        }
    }

    if (definition.security) {
        result.HostConfig.SecurityOpts = definition.security.opts || [''];
        result.HostConfig.CgroupParent = definition.security.cgroupParent || '';
        result.HostConfig.Privileged = definition.security.privileged || false;
        result.HostConfig.ReadonlyRootfs = definition.security.readonlyRootfs || false;

        if (definition.security.cap) {
            result.HostConfig.CapAdd = definition.security.cap.add || ['NET_ADMIN'];
            result.HostConfig.CapDrop = definition.security.cap.drop || ['MKNOD'];
        }

        if (definition.security.devices) {
            result.HostConfig.Devices = [];
            definition.security.devices.forEach(function(device) {
                result.HostConfig.Devices.push({
                    PathOnHost: device.pathOnHost,
                    PathInContainer: device.pathInContainer,
                    CGroupPermissions: device.permissions
                });
            });
        }
    }

    if (definition.network) {
        result.NetworkDisabled = false;
        result.MacAddress = definition.network.mac;
        result.HostConfig.NetworkMode = definition.network.mode || 'bridge';
        result.HostConfig.Dns = defintion.network.dns || ['8.8.8.8'];
        result.HostConfig.DnsSearch = definition.network.dnsSearch || [''];

        result.HostConfig.PublishAllPorts = definition.network.publishAllPorts || false;

        if (definition.network.hosts) {
            result.HostConfig.ExtraHosts = [];
            definition.network.hosts.forEach(function(hostMapping) {
                result.HostConfig.ExtraHosts.push(hostMapping.hostname + ':' + hostMapping.ip);
            });
        }
    }

    if (definition.labels) {
        result.Labels = {};

        definition.labels.forEach(function(mapping) {
            result.Labels[mapping.key] = mapping.value;
        });
    }


    return result;
}