var disk = require('diskusage'),
    os = require('os'),
    Q = require('q');

var config = require('./config').lookupEnvironment();

module.exports = function() {
    var nic = config.nic;
    var dataDir = config.dir.data;

    // -- check if the nic is available
    var nics = os.networkInterfaces();
    if (! nics[nic]) {
        return Q.reject(new Error('Unable to find details about the ' + nic + ' network interface. Does it have an ip?'));
    }

    var data = {
        deviceId: null,
        hostname: os.hostname(),
        arch: getArch(),
        memory: os.totalmem(),
        cpus: [],
        disks: [],
        ipv4: null,
        mac: null
    };

    // -- read the disk data
    return Q.all([
        getDiskInfo(dataDir)
    ]).then(function(disks) {
        data.disks.push({ type: 'data', mount: dataDir, size: disks[0].total});
    }).then(function() {
        // -- format the cpu's
        os.cpus().forEach(function (cpu) {
            data.cpus.push(cpu['model']);
        });

        nics[nic].forEach(function (address) {
            if (address['family'] == 'IPv4') {
                data.ipv4 = address.address;
                data.mac = address.mac;
                data.deviceId = address.mac.replace(/\:/g, '').toLowerCase()
            }
        });

        return data;
    });
};

function getArch() {
    var arch = os.arch();

    if (arch == 'x64') return 'x86_64';
    if (arch == 'arm') return 'armv7l';
    if (arch == 'ia32') return 'x86';
    return 'unknown';
}

function getDiskInfo(path) {
    var defer = Q.defer();

    disk.check(path, function(err, data) {
        if (err == -1) return defer.resolve({});
        else if (err) return defer.reject(err);
        else return defer.resolve(data);
    });

    return defer.promise;
}
