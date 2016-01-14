function HexHealthManager(nodeService, metricService) {
    this.nodeService = nodeService;
    this.metricService = metricService;

    this.healthCache = {};
    var self = this;

    // -- initialize the nodes health
    this.nodeService.nodes().then(function(nodes) {
        nodes.forEach(function (node) {
            self.healthCache[node['Name']] = -1.0;
        });
    });

    // -- every second we will check for health issues
    setInterval(function() { self.checkNodeAvailability() }, 333);
}

HexHealthManager.prototype.health = function(nodeName) {
    return this.healthCache[nodeName];
};

/**
 * Go through all nodes inside the hex and check if they are still available.
 */
HexHealthManager.prototype.checkNodeAvailability = function() {
    var self = this;

    this.nodeService.nodes().then(function(nodes) {
        nodes.forEach(function (node) {
            var nodeName = node['Name'];

            self.healthCache[nodeName] = getHealthiness(nodeName, self.metricService.last('load', nodeName));
        });
    });
};

function getHealthiness(nodeName, metrics) {
    var value = metrics;
    if (! value) return -1.0;

    return 1.0;
}

module.exports = HexHealthManager;


