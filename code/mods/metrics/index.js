var arrays = require('./../../utils/arrays'),
    TimeSeriesClock = require('../../utils/simple-time-series-clock');

var util         = require("util");
var EventEmitter = require('events').EventEmitter;

function MetricStore(cacheSize, cacheInterval) {
    var self = this;
    this.tsc = new TimeSeriesClock(cacheSize, cacheInterval);
    this.tsc.on('tick', function() {
        var last = self.tsc.last();
        self.emit('metrics', last);
    });
    this.tsc.start();

    this.metrics = {
        'load': {hex: []},
        'temperature': {hex: []},
        'memory': {hex: []},
        'osDisk': {hex: []},
        'dataDisk': {hex: []}
    };

    this.metricExtractors = {
        'load': function(data) { return data[0]; },
        'temperature': function(data) { return data; },
        'memory': function(data) { return (data.used / data.total) * 100; },
        'osDisk': function(data) { return (data.used / data.total) * 100; },
        'dataDisk': function(data) { return (data.used / data.total) * 100; }
    };

    this.metricRollups = {
        'load': function(dataArray) { return dataArray.reduce(function(prev, cur) { return prev + cur; }) / dataArray.length; },
        'temperature': function(dataArray) { return dataArray.reduce(function(prev, cur) { return prev + cur; }) / dataArray.length; },
        'memory': function(dataArray) { return dataArray.reduce(function(prev, cur) { return prev + cur; }); },
        'osDisk': function(dataArray) { return dataArray.reduce(function(prev, cur) { return prev + cur; }); },
        'dataDisk': function(dataArray) { return dataArray.reduce(function(prev, cur) { return prev + cur; }); }
    };
}

// -- make sure the metric store inherits from the event emitter
util.inherits(MetricStore, EventEmitter);

MetricStore.prototype.push = function(node, metric, value) {
    var current = this.tsc.current(node);
    current[metric] = value;
    this.tsc.push(node, current);
};

MetricStore.prototype.list = function(metric, node) {
    if (!metric) return null;
    if (!node) node = 'hex';

    return this.metrics[metric][node];
};

MetricStore.prototype.current = function(metric, node) {
    var currentValues;

    if (node) {
        currentValues = this.tsc.current(node);
        return (metric) ? currentValues[metric] : currentValues;
    } else {
        var result = {};
        currentValues = this.tsc.current();

        for (var k in currentValues.keys) {
            result[k].push((metric) ? currentValues[k][metric] : currentValues[k]);
        }

        return result;
    }
};

module.exports = MetricStore;

