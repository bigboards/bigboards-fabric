var os = require('os');
var log4js = require('log4js');
var logger = log4js.getLogger('device.manager');

module.exports = {
    firmware: 'v2.0',
    architecture: getArch(),
    hostname: os.hostname()
};

var nic = getNic();
if (nic == null) {
    logger.error('No NIC could be found! Valid nics are named p2p1, en0, eth0, wlp2s0 or wlan0');
    process.exit(1);
} else {
    module.exports.nic = nic;
    module.exports.ip = toIp(nic);
    module.exports.id = toId(nic);
}

function toId(itfInfo) {
    if (! itfInfo) return null;

    for (var idx in itfInfo) {
        if (! itfInfo.hasOwnProperty(idx)) continue;
        if (itfInfo[idx].family != 'IPv4') continue;

        return itfInfo[idx].mac.replace(/:/g, '');
    }
}

function toIp(itfInfo) {
    if (! itfInfo) return null;

    for (var idx in itfInfo) {
        if (! itfInfo.hasOwnProperty(idx)) continue;
        if (itfInfo[idx].family != 'IPv4') continue;

        return itfInfo[idx].address;
    }
}

function getNic() {
    var itfs = os.networkInterfaces();

    if (itfs.eth0) return itfs.eth0;
    if (itfs.wlp2s0) return itfs.wlp2s0;
    if (itfs.p2p1) return itfs.p2p1;
    if (itfs.en0) return itfs.en0;
    if (itfs.wlan0) return itfs.wlan0;
    return null;
}

function getArch() {
    var arch = os.arch();

    if (arch == 'x64') arch = 'x86_64';

    return arch;
}