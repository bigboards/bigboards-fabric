var winston = require('winston');

module.exports.handleError = function(res, error) {
    winston.info(error);
    winston.info(error.stack);

    if (!error) return res.send(500, 'No reason given');

    if (error.name == 'NotFoundError') {
        return res.send(404, error);
    } else if (error.name == 'IllegalParameterError') {
        return res.send(400, error);
    } else {
        return res.send(500, error);
    }
};

module.exports.handlePromise = function(res, promise) {
    return promise
        .then(function(results) {
            return res.json(results);
        })
        .fail(function(error) {

            var msg = JSON.stringify(error, ['stack', 'message', 'inner'], 4);

            if (error.name == 'AlreadyExistsError') {
                res.status(400).send(msg);
            } else if (error.name == 'IllegalParameterError') {
                res.status(400).send(msg);
            } else if (error.name == 'BadPayloadError') {
                res.status(400).send(msg);
            } else if (error.name == 'MissingParameterError') {
                res.status(400).send(msg);
            } else if (error.name == 'NotFoundError') {
                res.status(404).send(msg);
            } else {
                res.status(500).send(msg);
            }
        });
};

module.exports.registerGet = function(app, path, fn) {
    app.get(path, fn);
    winston.info('   [GET] ' + path);
};

module.exports.registerPut = function(app, path, fn) {
    app.put(path, function(req, res) { return fn(req, res); });
    winston.info('   [PUT] ' + path);
};

module.exports.registerPost = function(app, path, fn) {
    app.post(path, function(req, res) { return fn(req, res); });
    winston.info('  [POST] ' + path);
};

module.exports.registerDelete = function(app, path, fn) {
    app.del(path, function(req, res) { return fn(req, res); });
    winston.info('[DELETE] ' + path);
};

module.exports.isTint = function(obj) {
    if (! obj) return false;
    if (! obj.slug) return false;
    if (! obj.owner) return false;
    if (! obj.type) return false;

    return true;
};

module.exports.isTintWithUri = function(obj) {
    if (! this.isTint(obj)) return false;
    if (! obj.uri) return false;

    return true;
};