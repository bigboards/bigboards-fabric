var su = require('../utils/sys-utils');
var settings = require('../settings');


module.exports = {
    id: su.id(settings.get('nic')),
    ip: su.ip(settings.get('nic')),
    architecture: su.architecture()
};