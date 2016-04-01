var API = require('../api/api-helper'),
    MembershipService = require('./membership.service');

module.exports = {
    join: join,
    leave: leave,
    start: start,
    stop: stop,
    status: status
};

function join(req, res) {
    var body = req.body;

    API.handle.service(req, res, MembershipService.join(body.name, body.key, body.role, body.nodes, body.servers));
}

function leave(req, res) {
    API.handle.service(req, res, MembershipService.leave());
}

function start(req, res) {
    API.handle.service(req, res, MembershipService.start());
}

function stop(req, res) {
    API.handle.service(req, res, MembershipService.stop());
}

function status(req, res) {
    API.handle.service(req, res, MembershipService.status());
}

