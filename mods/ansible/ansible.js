var shelljs = require('shelljs');
var _ = require('underscore');
var format = require('util').format;
var inherits = require('util').inherits;
var utils = require('./utils');
var Q = require('q');
var jsesc = require('jsesc');

var spawn = require('child_process').spawn;

var AbstractAnsibleCommand = function() {};

AbstractAnsibleCommand.prototype = {

  exec: function(options) {
    var deferred = Q.defer();

    // Validate execution configuration
    var errors = this.validate();
    if (errors.length > 0) {
      var error = new Error('Ansible execution was mis-configured');
      error.reason = errors;
      deferred.reject(error);
      return deferred.promise;
    }

    var opt = {};

    if (options && options.cwd) {
      opt.cwd = options.cwd;
    }

    var command = this.compile();

    var child = spawn(command.command, command.args, opt);
    console.log("Executing " + command.command + " " + command.args.join(' '));

    // -- notify when stdout data comes in
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function(data) {
      deferred.notify({channel: 'output', data: data.toString()});
    });

    // -- notify when stderr data comes in
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', function(data) {
      deferred.notify({channel: 'error', data: data.toString()});
    });

    // -- resolve the deferred when the close event is emitted on the child process.
    child.on('close', function(code) {
      deferred.resolve({code: code});
    });

    return deferred.promise;
  },

  forks: function(forks) {
    this.config.forks = forks;
    return this;
  },

  verbose: function(level) {
    this.config.verbose = level;
    return this;
  },

  user: function(user) {
    this.config.user = user;
    return this;
  },

  inventory: function(inventory) {
    this.config.inventory = inventory;
    return this;
  },

  su: function(su) {
    this.config.su = su;
    return this;
  },

  asSudo: function() {
    this.config.sudo = true;
    return this;
  },

  addParam: function(args, param, flag) {
    if (this.config[param]) {
      args.push('-' + flag);
      args.push(this.config[param]);
    }
    return args;
  },

  addVerbose: function(args) {
    if (this.config.verbose) {
      args.push('-' + this.config.verbose);
    }
    return args;
  },

  addSudo: function(args) {
    if (this.config.sudo) {
      args.push('-s');
    }
    return args;
  },

  commonCompile: function(args) {
    args = this.addParam(args, "forks", "f");
    args = this.addParam(args, "user", "u");
    args = this.addParam(args, "inventory", "i");
    args = this.addParam(args, "su", "U");
    args = this.addVerbose(args);
    args = this.addSudo(args);

    return args;
  }

}

var AdHoc = function() {

  this.config = {};

  this.module = function (module) {
    this.config.module = module;
    return this;
  }

  this.args = function (args, freeform) {
    if (!_.isObject(args) && !_.isArray(args)) {
      freeform = args;
      args = null;
    }

    this.config.args = args;
    this.config.freeform = freeform;
    return this;
  }

  this.hosts = function (hosts) {
    this.config.hosts = hosts;
    return this;
  }

  this.validate = function () {
    var errors = [];
    var config = this.config;

    // Hosts are mandatory
    if (_.isUndefined(config.hosts) || _.isNull(config.hosts)) {
      errors.push('"hosts" must be specified');
    }

    // Module is mandatory
    if (_.isUndefined(config.module) || _.isNull(config.module)) {
      errors.push('"module" must be specified');
    }

    return errors;
  }

  this.compile = function() {
    var arguments = [];
    arguments.push(this.config.hosts);
    arguments = this.commonCompile(arguments);
    arguments.push('-m');
    arguments.push(this.config.module);

    if (this.config.args || this.config.freeform) {
      arguments.push('-a');
      arguments.push(utils.formatArgs(this.config.args, this.config.freeform));
    }

    return {command: 'ansible', args: arguments};
  }

}

inherits(AdHoc, AbstractAnsibleCommand);

var Playbook = function () {

  this.config = {};

  this.playbook = function(playbook) {
    this.config.playbook = playbook;
    return this;
  }

  this.variables = function(variables) {
    this.config.variables = variables;
    return this;
  }

  this.validate = function() {
    var errors = [];

    // Playbook is mandatory
    if (_.isUndefined(this.config.playbook) || _.isNull(this.config.playbook)) {
      errors.push("'playbook' must be specified")
    }

    return errors;
  }

  this.compile = function() {
    var playbook = this.config.playbook + ".yml";
    var arguments = [];
    arguments = this.commonCompile(arguments);

    if (this.config.variables) {
      arguments.push('-e');
      arguments.push(JSON.stringify(this.config.variables));
    }

    arguments.push(playbook);

    return {command: 'ansible-playbook', args: arguments};
  }

}

inherits(Playbook, AbstractAnsibleCommand);

module.exports.AdHoc = AdHoc;
module.exports.Playbook = Playbook;
