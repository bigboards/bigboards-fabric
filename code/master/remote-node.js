var RemoteResource = require('./remote-node-resource'),
    RemoteDaemon = require('./remote-node-daemon');

function RemoteNode(nodeId) {
    this.id = nodeId;
    this.resources = new RemoteResource(nodeId);
    this.daemons = new RemoteDaemon(nodeId);
}

module.exports = RemoteNode;



