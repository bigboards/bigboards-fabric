var https = require('https'),
    Q = require('q'),
    jwt = require('jsonwebtoken');

module.exports = {
    user: {
        updateMetadata: updateMetadata,
        get: getUser
    },
    token: {
        blacklist: blacklistToken
    }
};

function blacklistToken(token) {
    var decodedToken = jwt.decode(token);

    var defer = Q.defer();

    var options = {
        hostname: 'bigboards.auth0.com',
        port: 443,
        path: '/api/v2/blacklist/tokens',
        method: 'POST',
        headers: {
            'Authorization': "Bearer " + token,
            'Content-Type': 'application/json'
        }
    };

    var req = https.request(options, function(res) {
        var body = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function() {
            if (res.statusCode == 200) defer.resolve(JSON.parse(body));
            else defer.reject(body);
        })
    });

    req.on('error', function(e) {
        defer.reject(e);
    });

    // write data to request body
    req.write(JSON.stringify({ aud: decodedToken.aud, jti: decodedToken.jti }));
    req.end();

    return defer.promise;
}

function getUser(token) {
    // -- link the device to the profile. We can do this by calling auth0 and adding it to the metadata. I think we
    // -- should make use of a dedicated api from auth0 for this but I don't find any documentation about that yet.
    // -- look at https://github.com/auth0/docs/issues/416 for that.
    var defer = Q.defer();

    var decodedToken = jwt.decode(token);

    var options = {
        hostname: 'bigboards.auth0.com',
        port: 443,
        path: '/api/v2/users/' + decodedToken.sub,
        method: 'GET',
        headers: {
            'Authorization': "Bearer " + token,
            'Content-Type': 'application/json'
        }
    };

    var req = https.request(options, function(res) {
        var body = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function() {
            if (res.statusCode == 200) defer.resolve(JSON.parse(body));
            else defer.reject(body);
        })
    });

    req.on('error', function(e) {
        defer.reject(e);
    });

    // write data to request body
    req.end();

    return defer.promise;
}

function updateMetadata(token, metadata) {
    // -- link the device to the profile. We can do this by calling auth0 and adding it to the metadata. I think we
    // -- should make use of a dedicated api from auth0 for this but I don't find any documentation about that yet.
    // -- look at https://github.com/auth0/docs/issues/416 for that.
    var defer = Q.defer();

    var decodedToken = jwt.decode(token);

    var options = {
        hostname: 'bigboards.auth0.com',
        port: 443,
        path: '/api/v2/users/' + decodedToken.sub,
        method: 'PATCH',
        headers: {
            'Authorization': "Bearer " + token,
            'Content-Type': 'application/json'
        }
    };

    var req = https.request(options, function(res) {
        var body = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function() {
            if (res.statusCode == 200) defer.resolve(JSON.parse(body));
            else defer.reject(body);
        })
    });

    req.on('error', function(e) {
        defer.reject(e);
    });

    // write data to request body
    req.write(JSON.stringify({ app_metadata: metadata }));
    req.end();

    return defer.promise;
}
