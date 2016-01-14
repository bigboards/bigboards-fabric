var Q = require('q'),
    os = require('os');

module.exports.architecture = function() {
    var architecture = os.arch();

    if (architecture == 'x64') return 'x86_64';
    else if (architecture == 'ia32') return 'x86';
    else if (architecture == 'arm') return 'armv7l';
    else return 'unknown';
};