var Q = require('q'),
    fs = require('fs'),
    yaml = require("js-yaml"),
    http = require('http');

module.exports.getJson = function(hostname, port, path, headers) {
    var defer = Q.defer();

    if (! path) {
        path = port;
        port = 80;
    }

    var options = {
        hostname: hostname,
        port: port,
        path: path,
        method: 'GET'
    };

    if (headers) {
        options.headers = headers;
    }

    var req = http.request(options, function(res) {
        var data = null;
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            if (! data) data = chunk;
            else data += chunk;
        });

        res.on('end', function () {
            defer.resolve(JSON.parse(data));
        });
    });

    req.on('error', function(e) {
        defer.reject(e);
    });

    req.end();

    return defer.promise;
};