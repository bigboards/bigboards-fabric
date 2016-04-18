module.exports.endsWith = function (str, suffix) {
    if (! str) return false;
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

module.exports.startsWith = function (str, prefix) {
    if (! str) return false;
    return str.indexOf(prefix) === 0;
};

module.exports.stripFirst = function(str) {
    if (! str) return null;
    return str.substring(1);
};

module.exports.stripLast = function(str) {
    if (! str) return null;
    return str.substring(0, str.length - 2);
};

module.exports.toTintGUID = function(owner, slug) {
    return owner + '/' + slug;
};