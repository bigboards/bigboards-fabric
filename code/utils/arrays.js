module.exports.toArray = function (obj) {
    var result = [];

    for (var key in obj) {
        var value = obj[key];
        result.push(value);
    }

    return result;
}