var ApiUtils = require('../../utils/api-utils'),
    Q = require('q');

function TaskResource(taskService, serf) {
    this.taskService = taskService;
    this.serf = serf;
}

TaskResource.prototype.listTasks = function(req, res) {
    return ApiUtils.handlePromise(res, this.taskService.listTasks());
};

TaskResource.prototype.getCurrent = function(req, res) {
    return ApiUtils.handlePromise(res, this.taskService.current());
};

TaskResource.prototype.invokeTask = function(req, res) {
    var code = req.param('code');
    if (!code) return res.send(400, 'No task code has been passed!');

    return ApiUtils.handlePromise(res, this.taskService.invoke(code, req.body));
};

TaskResource.prototype.listAttempts = function(req, res) {
    var code = req.param('code');
    if (!code) return res.send(400, 'No task code has been passed!');

    return ApiUtils.handlePromise(res, this.taskService.listAttempts(code));
};

TaskResource.prototype.removeAttempts = function(req, res) {
    var code = req.param('code');
    if (!code) return res.send(400, 'No task code has been passed!');

    return ApiUtils.handlePromise(res, this.taskService.removeAttempts(code));
};

TaskResource.prototype.removeAttempt = function(req, res) {
    var code = req.param('code');
    if (!code) return res.send(400, 'No task code has been passed!');

    var attempt = req.param('attempt');
    if (!attempt) return res.send(400, 'No attempt id has been passed!');

    return ApiUtils.handlePromise(res, this.taskService.removeAttempt(code, attempt));
};

TaskResource.prototype.attemptOutput = function(req, res) {
    var code = req.param('code');
    if (!code) return res.send(400, 'No task code has been passed!');

    var attempt = req.param('attempt');
    if (!attempt) return res.send(400, 'No attempt id has been passed!');

    return ApiUtils.handlePromise(res, this.taskService.output(code, attempt));
};

TaskResource.prototype.attemptError = function(req, res) {
    var code = req.param('code');
    if (!code) return res.send(400, 'No task code has been passed!');

    var attempt = req.param('attempt');
    if (!attempt) return res.send(400, 'No attempt id has been passed!');

    return ApiUtils.handlePromise(res, this.taskService.error(code, attempt));
};

module.exports = TaskResource;