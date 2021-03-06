var Q = require('q'),
    os = require('os');

module.exports = {
    architecture: getArchitecture,
    platform: getPlatform,
    ip: getIpAddress,
    id: getUniqueId
};

function getPlatform() {
    return os.platform();
}

function getArchitecture() {
    var architecture = os.arch();

    if (architecture == 'x64') return 'x86_64';
    else if (architecture == 'ia32') return 'x86';
    else if (architecture == 'arm') return 'armv7l';
    else return 'unknown';
}

function getIpAddress(nic) {
    var nics = os.networkInterfaces();
    if (! nics[nic]) {
        throw new Error('Unable to find details about the ' + nic + ' network interface. Does it have an ip?');
    }

    for (var idx in nics[nic]) {
        if (! nics[nic].hasOwnProperty(idx)) continue;

        if (nics[nic][idx]['family'] == 'IPv4')
            return nics[nic][idx].address;
    }

    return null;
}

function getUniqueId(nic) {
    var nics = os.networkInterfaces();
    if (! nics[nic]) {
        throw new Error('Unable to find details about the ' + nic + ' network interface. Does it have an ip?');
    }

    for (var idx in nics[nic]) {
        if (! nics[nic].hasOwnProperty(idx)) continue;

        if (nics[nic][idx]['family'] == 'IPv4')
            return nics[nic][idx].mac.replace(/\:/g, '').toLowerCase();
    }

    return null;
}
