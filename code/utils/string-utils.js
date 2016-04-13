module.exports.endsWith = function (str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

module.exports.startsWith = function (str, prefix) {
    return str.indexOf(prefix) === 0;
};

module.exports.stripFirst = function(str) {
    return str.substring(1);
};

module.exports.stripLast = function(str) {
    return str.substring(0, str.length - 2);
};

module.exports.toTintGUID = function(owner, slug) {
    return owner + '/' + slug;
};