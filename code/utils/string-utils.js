module.exports.endsWith = function (str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

module.exports.toTintGUID = function(owner, slug) {
    return owner + '/' + slug;
};