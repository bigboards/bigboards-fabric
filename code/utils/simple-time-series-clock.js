var events = require('events');
var util = require('util');

function TimeSeriesClock(size, interval) {
    events.EventEmitter.call(this);

    this.size = size;
    this.interval = interval;
    this.position = 0;

    this.values = [{}];

    this.timer = 0;

    return this;
}

util.inherits(TimeSeriesClock, events.EventEmitter);

TimeSeriesClock.prototype.push = function(key, value) {
    this.values[this.position][key] = value;

    return value;
};

TimeSeriesClock.prototype.value = function(key, position) {
    var value = this.values[position];
    return value == undefined ? undefined : value[key];
};

TimeSeriesClock.prototype.all = function(key) {
    var result = new Array(this.size);

    this.values.forEach(function(value) {
        if (value) result.push(value[key]);
    });

    return result;
};

TimeSeriesClock.prototype.current = function (key) {
    var result = (!key) ? this.values[this.position] : this.value(key, this.position);
    return (result) ? result : {};
};

TimeSeriesClock.prototype.last = function (key) {
    return (! key) ? this.values[this.position - 1] : this.value(key, this.position - 1);
};

TimeSeriesClock.prototype.advance = function () {
    var lastValue = this.values[this.position];

    // -- shift the first value if the number of values is greater then the size of the TSC.
    if (this.position == this.size)
        this.values.shift();
    else
        this.position += 1;

    // -- we will update the current value with the last known value. This way we will never have an invalid
    // -- value if we just advanced
    this.values[this.position] = lastValue;

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
