var Q = require('q');
var consul = require('consul')();

module.exports = {
    create: createSession
};

function createSession(name, behaviour) {
    var defer = Q.defer();

    consul.session.create({behaviour: behaviour, name: name}, function(err, result) {
        return (err) ? defer.reject(err) : defer.resolve(result.ID);
    });

    return defer.promise;
}