var Q = require('q');
var consul = require('consul')();

var log4js = require('log4js');
var logger = log4js.getLogger('consul.session');

module.exports = {
    create: createSession,
    renew: renewSession,
    invalidate: invalidateSession
};

function createSession(name, behaviour) {
    var defer = Q.defer();

    consul.session.create({behaviour: behaviour, name: name, ttl: '60s'}, function(err, result) {
        return (err) ? defer.reject(err) : defer.resolve(result.ID);
    });

    return defer.promise;
}

function renewSession(sessionId) {
    var defer = Q.defer();

    consul.session.renew(sessionId, function(err, result) {
        return (err) ? defer.reject(err) : defer.resolve(result.ID);
    });

    return defer.promise;
}

function invalidateSession(sessionId) {
    logger.info("invalidating session " + sessionId);
    var defer = Q.defer();

    consul.session.destroy({ id: sessionId}, function(err, result) {
        if (err) {
            logger.warn('Unable to invalidate the session with id ' + sessionId);
            defer.reject(err);
        } else {
            logger.info('Invalidated session with id ' + sessionId);
            defer.resolve(result);
        }
    });

    return defer.promise;
}