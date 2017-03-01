function MissingArgumentError(argument) {
    this.name = "MissingArgumentError";
    this.message = "The '" + argument + "' argument was expected but has not been set.";
    this.stack = Error().stack;
}
MissingArgumentError.prototype = Object.create(Error.prototype);
module.exports.MissingArgumentError = MissingArgumentError;

function NotFoundError(message) {
    this.name = "NotFoundError";
    this.message = message;
    this.stack = Error().stack;
}
NotFoundError.prototype = Object.create(Error.prototype);
module.exports.NotFoundError = NotFoundError;

function BadRequestError(message) {
    this.name = "BadRequestError";
    this.message = message;
    this.stack = Error().stack;
}
BadRequestError.prototype = Object.create(Error.prototype);
module.exports.BadRequestError = BadRequestError;

function IllegalParameterError(message) {
    this.name = "IllegalParameterError";
    this.message = message;
    this.stack = Error().stack;
}
IllegalParameterError.prototype = Object.create(Error.prototype);
module.exports.IllegalParameterError = IllegalParameterError;

function TasksRunnerBusyError(message) {
    this.name = "TasksRunnerBusyError";
    this.message = message;
    this.stack = Error().stack;
}
TasksRunnerBusyError.prototype = Object.create(Error.prototype);
module.exports.TasksRunnerBusyError = TasksRunnerBusyError;

function TaskAlreadyStartedError(message) {
    this.name = "TaskAlreadyStartedError";
    this.message = message;
    this.stack = Error().stack;
}
TaskAlreadyStartedError.prototype = Object.create(Error.prototype);
module.exports.TaskAlreadyStartedError = TaskAlreadyStartedError;

function TaskParameterError(message) {
    this.name = "TaskParameterError";
    this.message = message;
    this.stack = Error().stack;
}
TaskParameterError.prototype = Object.create(Error.prototype);
module.exports.TaskParameterError = TaskParameterError;

function TintInstallationError(message) {
    this.name = "TintInstallationError";
    this.message = message;
    this.stack = Error().stack;
}
TintInstallationError.prototype = Object.create(Error.prototype);
module.exports.TintInstallationError = TintInstallationError;

function DaemonAlreadyRunningError(daemon) {
    this.name = "DaemonAlreadyRunningError";
    this.daemon = daemon;
    this.stack = Error().stack;
}
DaemonAlreadyRunningError.prototype = Object.create(Error.prototype);
module.exports.DaemonAlreadyRunningError = DaemonAlreadyRunningError;

function DaemonNotRunningError(daemon) {
    this.name = "DaemonNotRunningError";
    this.daemon = daemon;
    this.stack = Error().stack;
}
DaemonNotRunningError.prototype = Object.create(Error.prototype);
module.exports.DaemonNotRunningError = DaemonNotRunningError;

function DaemonAlreadyInstalledError(daemon) {
    this.name = "DaemonAlreadyInstalledError";
    this.daemon = daemon;
    this.stack = Error().stack;
}
DaemonAlreadyInstalledError.prototype = Object.create(Error.prototype);
module.exports.DaemonAlreadyInstalledError = DaemonAlreadyInstalledError;

function DaemonNotInstalledError(daemon) {
    this.name = "DaemonNotInstalledError";
    this.daemon = daemon;
    this.stack = Error().stack;
}
DaemonNotInstalledError.prototype = Object.create(Error.prototype);
module.exports.DaemonNotInstalledError = DaemonNotInstalledError;

function DaemonCommandMissing(daemon, command) {
    this.name = "DaemonNotInstalledError";
    this.daemon = daemon;
    this.command = command;
    this.stack = Error().stack;
}
DaemonCommandMissing.prototype = Object.create(Error.prototype);
module.exports.DaemonCommandMissing = DaemonCommandMissing;