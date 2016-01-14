function FFiFo(size) {
    this.size = size;
    this.arr = [];

    return this;
}

FFiFo.prototype = {
    push: function(item) {
        this.arr.push(item);

        if (this.arr.length > this.size) {
            // -- remove the first item
            this.arr.shift();
        }
    },

    last: function(size) {
        if (size < this.arr.length) {
            return this.arr.slice(this.arr.length - size, this.arr.length);
        } else {
            return this.arr;
        }
    },

    all: function() {
        return this.arr;
    },

    length: function() {
        return this.arr.length;
    }
};

module.exports = FFiFo;
