var disk = require('diskusage'),
    os = require('os'),
    su = require('./utils/sys-utils'),
    Q = require('q');

var settings = require('./settings');

module.exports = function() {
    var nic = settings.get('nic');
    var dataDir = settings.get('data_dir');

    // -- check if the nic is available
    var nics = os.networkInterfaces();
    if (! nics[nic]) {
        return Q.reject(new Error('Unable to find details about the ' + nic + ' network interface. Does it have an ip?'));
    }

    var data = {
        deviceId: null,
        name: os.hostname(),
        hostname: os.hostname(),
        arch: su.architecture(),
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

function getDiskInfo(path) {
    var defer = Q.defer();

    disk.check(path, function(err, data) {
        if (err == -1) return defer.resolve({});
        else if (err) return defer.reject(err);
        else return defer.resolve(data);
    });

    return defer.promise;
}
