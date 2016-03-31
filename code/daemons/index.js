var sleep = require('sleep'),
    Docker = require('./docker'),
    Consul = require('./consul');

var config = require('../config').lookupEnvironment();

var docker = new Docker(config);
var consul = new Consul(config);

function start() {
    // -- start docker if needed
    if (docker.enabled && docker.isInstalled()) {
        docker.clean();
        docker.start();
    }

    // -- start consul if needed
    if (consul.enabled && consul.isInstalled()) {
        consul.clean();
        consul.start();
    }
}

function destroy() {
    if (docker.isRunning()) {
        docker.stop();
        sleep.sleep(2);
    }

    if (consul.isRunning()) {
        consul.stop();
        sleep.sleep(2);
    }
}


module.exports = {
    docker: docker,
    consul: consul,
    start: start,
    destroy: destroy
};