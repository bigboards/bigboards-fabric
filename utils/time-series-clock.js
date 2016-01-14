var events = require('events');
var util = require('util');

function TimeSeriesClock(size, interval) {
    events.EventEmitter.call(this);

    this.size = size;
    this.interval = interval;
    this.position = 0;
    this.map = {};
    this.values = new Array(this.size);
    this.timer = 0;

    return this;
}

util.inherits(TimeSeriesClock, events.EventEmitter);

TimeSeriesClock.prototype.push = function (key, newValue) {
    if (!this.contains(key)) {
        this.map[key] = undefined;
    }

    var value = this.values[this.position];
    if (value == undefined) {
        this.values[this.position] = {};
        value = this.values[this.position];
    }

    var oldValue = value[key];
    value[key] = newValue;

    this.emit("push", oldValue, newValue);

    return newValue;
};

TimeSeriesClock.prototype.keys = function() {
    return this.map;
};

TimeSeriesClock.prototype.value = function(key, position) {
    var value = this.values[position];
    return value == undefined ? undefined : value[key];
};

TimeSeriesClock.prototype.all = function () {
    var l = this.size - 1;
    var result = new Array(l);

    for (var i = 1; i <= l; i++) {
        var p = this.logicalPosition(i);
        result[i-1] = this.values[p];
    }

    return result;
};

TimeSeriesClock.prototype.length = function () {
    return this.map.length();
};

TimeSeriesClock.prototype.last = function (key) {
    return this.value(key, this.position - 1);
};

TimeSeriesClock.prototype.contains = function (key) {
    return (key in this.map);
};

TimeSeriesClock.prototype.containsRecent = function (key) {
    var pos = this.position - 1;
    return (key in this.map) && (this.values[pos] != undefined) && (this.values[pos][key] != undefined) && (this.values[pos][key] != null);
};

TimeSeriesClock.prototype.clean = function (position) {
    for (var i in this.map) {
        var value = this.values[position];
        if (value != undefined && value.hasOwnProperty(i)) {
            value[i] = undefined;
        }
    }
};

TimeSeriesClock.prototype.logicalPosition = function(i)  {
    var result = this.position + i;

    if (result >= this.size) {
        result -= this.size;
    }

    return result;
};

TimeSeriesClock.prototype.previousPosition = function(currentPosition)  {
    return currentPosition > 0 ? currentPosition - 1 : this.size - currentPosition - 1;
};

TimeSeriesClock.prototype.advance = function () {
    this.position += 1;

    if (this.position == this.size) {
        this.position = 0;
    }

    this.clean(this.position);

    this.emit("tick", this.position);

    return this.position;
};

TimeSeriesClock.prototype.start = function () {
    if (!this.isStarted()) {
        this.timer = setInterval(advanceCallback, this.interval, this);
    }

    return this.timer;
};

TimeSeriesClock.prototype.isStarted = function () {
    return this.timer != 0;
};

TimeSeriesClock.prototype.stop = function () {
    if (this.isStarted()) {
        this.clearInterval(this.timer);
        this.timer = 0;
    }

    return this.timer;
};

module.exports = TimeSeriesClock;

function advanceCallback(timeSeriesClock) {
    timeSeriesClock.advance();
}
