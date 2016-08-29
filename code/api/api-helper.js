var log4js = require('log4js'),
    Q = require('q');

var logger = log4js.getLogger('api');

module.exports = {
    register: {
        head: registerHead,
        get: registerGet,
        put: registerPut,
        post: registerPost,
        patch: registerPatch,
        delete: registerDelete,
        guarded: {
            head: registerGuardedHead,
            get: registerGuardedGet,
            put: registerGuardedPut,
            post: registerGuardedPost,
            patch: registerGuardedPatch,
            delete: registerGuardedDelete
        }
    },
    handle: {
        service: handleServiceCall,
        missingParameter: handleMissingParameter
    }
};

function registerHead(app, path, fn) {
    app.head(path, function(req, res) { return fn(req, res); });
    logger.info('   [HEAD] ' + path);
}

function registerGet(app, path, fn) {
    app.get(path, function(req, res) { return fn(req, res); });
    logger.info('   [GET] ' + path);
}

function registerPut(app, path, fn) {
    app.put(path, function(req, res) { return fn(req, res); });
    logger.info('    [PUT] ' + path);
}

function registerPost(app, path, fn) {
    app.post(path, function(req, res) { return fn(req, res); });
    logger.info('   [POST] ' + path);
}

function registerPatch(app, path, fn) {
    app.patch(path, function(req, res) { return fn(req, res); });
    logger.info('   [PATCH] ' + path);
}

function registerDelete(app, path, fn) {
    app.delete(path, function(req, res) { return fn(req, res); });
    logger.info('[DELETE] ' + path);
}

function registerGuardedHead(app, path, guard, fn) {
    app.head(path, guard, function(req, res) { return fn(req, res); });
    logger.info('   [HEAD] ' + path);
}

function registerGuardedGet(app, path, guard, fn) {
    app.get(path, guard, function(req, res) { return fn(req, res); });
    logger.info('   [GET] ' + path);
}

function registerGuardedPut(app, path, guard, fn) {
    app.put(path, guard, function(req, res) { return fn(req, res); });
    logger.info('    [PUT] ' + path);
}

function registerGuardedPost(app, path, guard, fn) {
    app.post(path, guard, function(req, res) { return fn(req, res); });
    logger.info('   [POST] ' + path);
}

function registerGuardedPatch(app, path, guard, fn) {
    app.patch(path, guard, function(req, res) { return fn(req, res); });
    logger.info('   [PATCH] ' + path);
}

function registerGuardedDelete(app, path, guard, fn) {
    app.delete(path, guard, function(req, res) { return fn(req, res); });
    logger.info('[DELETE] ' + path);
}

function handleServiceCall(req, res, promise) {
    Q(promise).then(function(data) {
        res.status(200).json(data);
    }, function(error) {
        logger.error(error);
        if (! error) return res.status(500).json({message: 'Undetermined error occured'});

        if (error.name == 'NotFoundError') return res.status(404).json({message: 'The requested resource could not be found.', detail: error});

        return res.status(500).json({message: error.message, detail: error});
    });
}

function handleMissingParameter(req, res, parameter, parameterLocation) {
    res.status(400).json({message: 'Missing parameter ' + parameter, detail: 'The ' + parameter + ' parameter could not be found on the request ' + parameterLocation});
}