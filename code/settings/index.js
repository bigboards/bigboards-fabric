var fs = require('../utils/fs-utils');

if (! process.env.BB_FABRIC_CONFIG_FILE) {
    throw new Error('The BB_FABRIC_CONFIG_FILE environment variable has not been set. Don\'t know where to get my configuration');
}

var settings = fs.readYamlFile(process.env.BB_FABRIC_CONFIG_FILE);

module.exports = {
    all: all,
    set: setProperty,
    has: hasProperty,
    get: getProperty,
    path: getPath,
    remove: removeProperty
};

function setProperty(key, value) {
    settings[key] = value;

    fs.writeYamlFile(process.env.BB_FABRIC_CONFIG_FILE, settings);
}

function hasProperty(key) {
    var value = settings[key];

    return (!! value);
}

function getPath(key, defaultValue) {
    var value = settings[key];

    return fs.parentFileName(process.env.BB_FABRIC_CONFIG_FILE) + '/' + ((value) ? value : defaultValue)
}

function getProperty(key, defaultValue) {
    var value = settings[key];

    return (value) ? value : defaultValue;
}

function removeProperty(key) {
    delete settings[key];

    fs.writeYamlFile(process.env.BB_FABRIC_CONFIG_FILE, settings);
}

function all() {
    return settings;
}
