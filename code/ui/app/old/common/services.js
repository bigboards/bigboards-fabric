app.factory('socket', function (settings, socketFactory, $location) {
    var ioUrl = $location.protocol() + '://' + $location.host() + ':' + $location.port() + '/';

    if (settings.api)
        ioUrl = settings.api;

    var myIoSocket = io.connect(ioUrl);

    return socketFactory({
        ioSocket: myIoSocket
    });
});

app.service('Hex', [ 'settings', '$http', '$q', 'toaster', 'socket', function(settings, $http, $q, toaster, socket) {
    var Hex = function Hex() {
        this.identity = null;
        this._identityLoaded = false;

        this.installedTints = null;
        this._installedTintsLoaded = false;

        var self = this;

        // -- register a task listener for installing and uninstalling tasks
        socket.on('task:finished', function(data) {
            if (data.task.code.indexOf('install') != -1) {
                self.getInstalledTints(true);
            }
        });

        socket.on('task:failed', function(data) {
            if (data.task.code.indexOf('install') != -1) {
                self.getInstalledTints(true);
            }
        });
    };

    Hex.prototype.get = function() {
        return $http.get(settings.api + '/api/v1/hex');
    };

    Hex.prototype.getInstalledTints = function(force) {
        var self = this;

        if (force)
            this._installedTintsLoaded = false;

        if (this._installedTintsLoaded) {
            return $q(function(resolve, reject) {
                resolve(self.installedTints);
            });
        } else {
            return $http
                .get(settings.api + '/api/v1/hex/tints')
                .then(function(response) {
                    self.installedTints = response.data;
                    self._installedTintsLoaded = true;

                    return self.installedTints;
                });
        }
    };

    Hex.prototype.link = function(token) {
        var self = this;

        return $http
            .post(settings.api + '/api/v1/hex/link', {token: token});
    };

    Hex.prototype.unlink = function() {
        var self = this;

        return $http
            .delete(settings.api + '/api/v1/hex/link');
    };

    Hex.prototype.getIdentity = function(force) {
        var self = this;

        if (force)
            this._identityLoaded = false;

        if (this._identityLoaded) {
            return $q(function(resolve, reject) {
                resolve(self.identity);
            });
        } else {
            return $http
                .get(settings.api + '/api/v1/hex')
                .then(function(response) {
                    self.identity = response.data;
                    self._identityLoaded = true;

                    return self.identity;
                });
        }
    };

    Hex.prototype.halt = function() {
        $http.delete(settings.api + '/api/v1/hex')
            .success(function(data, status, headers, config) {
                toaster.pop({
                    type: 'success',
                    title: 'Hex Halted',
                    body: 'All services on this hex have been disabled. You can now safely remove the power.',
                    showCloseButton: true
                });
            })
            .error(function(data, status, headers, config) {
                toaster.pop({
                    type: 'error',
                    title: 'Shutdown Failed',
                    body: 'Failed to power off this hex. The hex responded with the following message: "' + data + '"',
                    showCloseButton: true
                });
            });
    };

    Hex.prototype.isInstalled = function(type, owner, slug) {
        var id = '[' + type + ']' + owner + '$' + slug;

        return this.getInstalledTints().then(function(tints) {
            return (tints[id] != null);
        });
    };

    Hex.prototype.getTint = function(type, owner, slug) {
        var id = '[' + type + ']' + owner + '$' + slug;

        return this.getInstalledTints().then(function(tints) {
            return tints[id];
        }).catch(function() {
            toaster.pop({
                type: 'error',
                body: 'Unable to get the tint with id ' + id
            })
        });
    };

    Hex.prototype.install = function(data, onSuccess, onError) {
        var self = this;

        $http.post(settings.api + '/api/v1/hex/tints', data)
            .success(function(data, status, headers, config) {
                self.getInstalledTints(true);
                if (onSuccess) onSuccess(data);
            })
            .error(function(data, status, headers, config) {
                if (onError) onError(data);
                toaster.pop({
                    type: 'error',
                    title: 'Installation Failed',
                    body: data.message,
                    showCloseButton: true
                });
            });
    };

    Hex.prototype.uninstall = function(tint, onSuccess, onError) {
        var self = this;

        $http.delete(settings.api + '/api/v1/hex/tints/' + tint.type + '/' + tint.owner + '/' + tint.slug)
            .success(function(data, status, headers, config) {
                self.getInstalledTints(true);
                if (onSuccess) onSuccess(data);
            })
            .error(function(data, status, headers, config) {
                if (onError) onError(data);
                toaster.pop({
                    type: 'error',
                    title: 'Uninstallation Failed',
                    body: 'Failed to uninstall the tint with id ' + tint.id + '. The hex responded with the following message: "' + data + '"',
                    showCloseButton: true
                });
            });
    };

    return new Hex();
}]);

app.service('Registry', [ 'settings', '$http', '$q', 'toaster', 'socket', function(settings, $http, $q, toaster, socket) {
    var Registry = function Registry() {
        var self = this;
    };

    Registry.prototype.list = function() {
        return $http.get(settings.api + '/api/v1/registry');
    };

    Registry.prototype.get = function(registryName) {
        if (! registryName) throw new Error('No registry name provided!');

        return $http.get(settings.api + '/api/v1/registry/' + registryName);
    };

    Registry.prototype.add = function(data) {
        return $http.put(settings.api + '/api/v1/registry', data);
    };

    Registry.prototype.update = function(registryName, data) {
        if (! registryName) throw new Error('No registry name provided!');

        return $http.post(settings.api + '/api/v1/registry/' + registryName, data);
    };

    Registry.prototype.remove = function(registryName) {
        if (! registryName) throw new Error('No registry name provided!');

        return $http.delete(settings.api + '/api/v1/registry/' + registryName);
    };

    return new Registry();
}]);

app.service('Nodes', function(settings, $resource) {
    return $resource(settings.api + '/api/v1/hex/nodes', { }, {
        'list': { method: 'GET', isArray: true}
    });
});

app.service('Stacks', function(settings, $resource) {
    return $resource(settings.api + '/api/v1/hex/stacks/:owner/:id', {id: '@id', owner: '@owner'}, {
        'list': { method: 'GET', isArray: true},
        'get': { method: 'GET', isArray: false},
        'install': { method: 'POST' },
        'uninstall': { method: 'DELETE' }
    });
});

app.service('Tutors', function(settings, $resource) {
    return $resource(settings.api + '/api/v1/hex/tutors/:owner/:id', {id: '@id', owner: '@owner'}, {
        'list': { method: 'GET', isArray: true},
        'get': { method: 'GET', isArray: false},
        'install': { method: 'POST' },
        'uninstall': { method: 'DELETE' }
    });
});

app.service('Tasks', function(settings, $resource) {
    return $resource(settings.api + '/api/v1/tasks/:code', {code: '@code'}, {
        'list': { method: 'GET', isArray: false},
        'current': { method: 'GET', params: {code: 'current'}, isArray: false}
    });
});

app.service('TaskAttempts', function(settings, $resource) {
    return $resource(settings.api + '/api/v1/tasks/:code/attempts/:attempt/:channel', {code: '@code', attempt: '@attempt', channel: '@channel'}, {
        'list': { method: 'GET', isArray: true},
        'get': { method: 'GET', isArray: false},
        'output': { method: 'GET', params: { channel: 'output' }, isArray: false},
        'error': { method: 'GET', params: { channel: 'error' }, isArray: false},
        'clear': { method: 'DELETE' }
    });
});

app.service('TaskManager', function(settings, socket, $resource, Tasks, TaskAttempts) {
    var TaskManager = function TaskManager(socket) {
        var self = this;
        this.busy = false;
        this._currentAttempt = null;

        Tasks.current().$promise.then(function(attempt) {
            self._currentAttempt = attempt;
            self.busy = ((attempt !== undefined) && (attempt.$resolved) && (attempt['attempt'] !== undefined));
        });

        socket.on('task:started', function(attempt) {
            self._currentAttempt = attempt;
            self.busy = true;
        });

        socket.on('task:finished', function(attempt) {
            self._currentAttempt = null;
            self.busy = false;
        });

        socket.on('task:failed', function(attempt) {
            self._currentAttempt = null;
            self.busy = false;
        });
    };

    TaskManager.prototype.currentAttempt = function() { return this._currentAttempt; };
    TaskManager.prototype.listTasks = function() { return Tasks.list(); };
    TaskManager.prototype.listAttempts = function(taskCode) { return TaskAttempts.list({code: taskCode}); };
    TaskManager.prototype.attemptOutput = function(taskCode, attemptCode) { return TaskAttempts.output({code: taskCode, attempt: attemptCode}); };
    TaskManager.prototype.attemptError = function(taskCode, attemptCode) { return TaskAttempts.error({code: taskCode, attempt: attemptCode}); };
    TaskManager.prototype.removeAttempt = function(taskCode, attemptCode) { return TaskAttempts.clear({code: taskCode, attempt: attemptCode}); };

    return new TaskManager(socket);
});

app.service ('Identity', function($resource) {
    return $resource('/api/v1/identity');
});

app.service('Firmware', function($resource) {
    return $resource('/api/v1/firmware', undefined, {
        'install': {method: 'POST', isArray: false}
    });
});

app.service('Patches', function($resource) {
    return $resource('/api/v1/patches/:patch', {patch: '@patch'}, {
        'install': {method: 'PUT', isArray: false}
    });
});

app.service('Tints', function(settings, $resource) {
    return $resource(settings.api + '/api/v1/hex/tints/:type/:owner/:slug', {slug: '@slug', owner: '@owner', type: '@type'}, {
        'list': { method: 'GET', isArray: true},
        'get': { method: 'GET', isArray: false},
        'install': { method: 'POST' },
        'uninstall': { method: 'DELETE' }
    });
});

app.service('Tutorials', function(settings, $http) {
    var service = function() { };

    service.prototype.toc = function(owner, slug) {
        var url = settings.api + '/api/v1/tutorials/' + owner + '/' + slug + '/toc';

        return $http.get(url);
    };

    service.prototype.page = function(owner, slug, path) {
        var url = settings.api + '/api/v1/tutorials/' + owner + '/' + slug + '/page/' + path;

        return $http.get(url);
    };

    return new service;
});

app.service('TintConfig', function($resource) {
    return $resource('/api/v1/tints/:tintId/config', {tintId: '@tintId'});
});

app.service('Tint', function($resource, $rootScope, Tints) {
    var service = function() {
        this.viewCache = null;
        this.actionCache = null;
        this.configCache = null;
    };

    service.prototype.views = function(cb) {
        var me = this;

        if (! this.viewCache) {
            return Tints.get(
                {tintId: $rootScope.tint.id, category: 'views'},
                function(data) {
                    me.viewCache = data;
                    return cb(me.viewCache);
                },
                function() {
                    me.viewCache = null;
                    return cb(null);
                }
            )
        } else {
            return cb(this.viewCache);
        }
    };

    service.prototype.actions = function(cb) {
        var me = this;

        if (! this.actionCache) {
            return Tints.get(
                {tintId: $rootScope.tint.id, category: 'actions'},
                function(data) {
                    me.actionCache = data;
                    return cb(me.actionCache);
                },
                function() {
                    me.actionCache = null;
                    return cb(null);
                }
            )
        } else {
            return cb(this.viewCache);
        }
    };

    service.prototype.config = function(cb) {
        var me = this;

        if (! this.configCache) {
            return Tints.get(
                {tintId: $rootScope.tint.id, category: 'config'},
                function(data) {
                    me.configCache= data;
                    return cb(me.configCache);
                },
                function() {
                    me.configCache = null;
                    return cb(null);
                }
            )
        } else {
            return cb(this.configCache);
        }
    };


    return new service;
});

app.factory('Rest', ['$http', 'settings', function($http, settings) {
    var rest = function(baseUrl) {
        this.url = baseUrl | '/';
    };

    rest.prototype.query = function(param, value) {
        if (this.url.indexOf('?') == -1) this.url += '?';
        else this.url += '&';

        this.url += (param + '=' + value);

        return this;
    };

    rest.prototype.entity = function(entity, id) {
        this.url += entity;

        if (id) this.url += ('/' + id);

        return this;
    };

    rest.prototype.get = function() {
        return $http.get(this.url);
    };

    rest.prototype.post = function(data) {
        return $http.post(this.url, data);
    };

    rest.prototype.put = function(data) {
        return $http.put(this.url, data);
    };

    rest.prototype.del = function() {
        return $http.delete(this.url, data);
    };

    return new rest(settings.api);
}]);

app.factory('ApiFeedback', function($rootScope, toaster) {
    var ApiFeedback = function ApiFeedback() {};

    ApiFeedback.prototype.onSuccess = function(msg, cb) {
        var self = this;

        return function(data) {
            try {
                // -- perform the callback
                if (cb) cb(data);

                // -- emit the success event
                self.success(msg);
            } catch (e) {
                console.log(e);
                this.error(
                    'Something went wrong while processing the feedback from the backend. The call actually made it ' +
                    'to the backend but the response which was sent back was not processed correctly by your browser. Please refresh the ' +
                    'page to make sure the state of the backend is represented on your screen.'
                );
            }
        };
    };

    ApiFeedback.prototype.onError = function(msgs, cb) {
        var self = this;

        if (!msgs) msgs = {};

        return function(error) {
            try {
                // -- perform the callback
                if (cb) cb(error);

                console.log('HTTP ' + error.status + ':' + error.data);

                if (error.status === 400) { // -- Invalid Request
                    self.danger(
                        'The request has been rejected by the server. This probably means wrong data has been sent to ' +
                        'the server and will most likely be caused by a bug in the software. Please report this on ' +
                        '<a href="http://issues.bigboards.io" target="_blank">the BigBoards issue tracker</a>'
                    );

                } else if (error.status === 403) { // -- Forbidden
                    self.danger(
                        'Access to the given resource is not allowed. If you think this is incorrect please report this on ' +
                        '<a href="http://issues.bigboards.io" target="_blank">the BigBoards issue tracker</a>'
                    );

                } else if (error.status === 404) { // -- Not Found
                    if (msgs['404']) self.danger(msgs['404']);
                    else self.danger('The requested item could not be found.');

                } else if (error.status === 500) { // -- Server Error
                    self.danger(
                        'The request has generated an error on the server. This will most likely be caused by a bug in ' +
                        'the software. Please report this on ' +
                        '<a href="http://issues.bigboards.io" target="_blank">the BigBoards issue tracker</a>'
                    );

                } else if (error.status === 502 || error.status === 503 || error.status === 504) { // -- Not Available
                    self.danger(
                        'The backend is currently not available. The most frequent reason for this is the absence of a ' +
                        ' running bigboards-mmc server. Try to login to your hex and verify there is a bigboards-mmc server ' +
                        ' running.'
                    );

                } else {
                    self.danger(
                        'An error has occurred while processing your request. It is not clear if this is caused by a bug ' +
                        'or by some strange co-incident. Further investigation is needed. Please report this on <a href="http://issues.bigboards.io" target="_blank">the BigBoards issue tracker</a>'
                    );
                }
            } catch (e) {
                self.danger(
                    'Something went wrong while processing the feedback from the backend. The call actually made it ' +
                    'to the backend but the response which was sent back was not processed correctly by your browser. Please refresh the ' +
                    'page to make sure the state of the backend is represented on your screen.'
                );
            }
        }
    };

    ApiFeedback.prototype.success = function(message) {
        toaster.pop({
            type: 'success',
            body: 'message',
            showCloseButton: true
        });
    };

    ApiFeedback.prototype.info = function(message) {
        toaster.pop({
            type: 'info',
            body: 'message',
            showCloseButton: true
        });
    };

    ApiFeedback.prototype.danger = function(message) {
        toaster.pop({
            type: 'error',
            body: 'message',
            showCloseButton: true
        });
    };

    ApiFeedback.prototype.warning = function(message) {
        toaster.pop({
            type: 'warning',
            body: 'message',
            showCloseButton: true
        });
    };

    return new ApiFeedback();
});

// This service was based on OpenJS library available in BSD License
// http://www.openjs.com/scripts/events/keyboard_shortcuts/index.php
app.factory('keyboardManager', ['$window', '$timeout', function ($window, $timeout) {
    var keyboardManagerService = {};

    var defaultOpt = {
        'type':             'keydown',
        'propagate':        false,
        'inputDisabled':    false,
        'target':           $window.document,
        'keyCode':          false
    };
    // Store all keyboard combination shortcuts
    keyboardManagerService.keyboardEvent = {}
    // Add a new keyboard combination shortcut
    keyboardManagerService.bind = function (label, callback, opt) {
        var fct, elt, code, k;
        // Initialize opt object
        opt   = angular.extend({}, defaultOpt, opt);
        label = label.toLowerCase();
        elt   = opt.target;
        if(typeof opt.target == 'string') elt = document.getElementById(opt.target);

        fct = function (e) {
            e = e || $window.event;

            // Disable event handler when focus input and textarea
            if (opt['inputDisabled']) {
                var elt;
                if (e.target) elt = e.target;
                else if (e.srcElement) elt = e.srcElement;
                if (elt.nodeType == 3) elt = elt.parentNode;
                if (elt.tagName == 'INPUT' || elt.tagName == 'TEXTAREA') return;
            }

            // Find out which key is pressed
            if (e.keyCode) code = e.keyCode;
            else if (e.which) code = e.which;
            var character = String.fromCharCode(code).toLowerCase();

            if (code == 188) character = ","; // If the user presses , when the type is onkeydown
            if (code == 190) character = "."; // If the user presses , when the type is onkeydown

            var keys = label.split("+");
            // Key Pressed - counts the number of valid keypresses - if it is same as the number of keys, the shortcut function is invoked
            var kp = 0;
            // Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
            var shift_nums = {
                "`":"~",
                "1":"!",
                "2":"@",
                "3":"#",
                "4":"$",
                "5":"%",
                "6":"^",
                "7":"&",
                "8":"*",
                "9":"(",
                "0":")",
                "-":"_",
                "=":"+",
                ";":":",
                "'":"\"",
                ",":"<",
                ".":">",
                "/":"?",
                "\\":"|"
            };
            // Special Keys - and their codes
            var special_keys = {
                'esc':27,
                'escape':27,
                'tab':9,
                'space':32,
                'return':13,
                'enter':13,
                'backspace':8,

                'scrolllock':145,
                'scroll_lock':145,
                'scroll':145,
                'capslock':20,
                'caps_lock':20,
                'caps':20,
                'numlock':144,
                'num_lock':144,
                'num':144,

                'pause':19,
                'break':19,

                'insert':45,
                'home':36,
                'delete':46,
                'end':35,

                'pageup':33,
                'page_up':33,
                'pu':33,

                'pagedown':34,
                'page_down':34,
                'pd':34,

                'left':37,
                'up':38,
                'right':39,
                'down':40,

                'f1':112,
                'f2':113,
                'f3':114,
                'f4':115,
                'f5':116,
                'f6':117,
                'f7':118,
                'f8':119,
                'f9':120,
                'f10':121,
                'f11':122,
                'f12':123
            };
            // Some modifiers key
            var modifiers = {
                shift: {
                    wanted:		false,
                    pressed:	e.shiftKey ? true : false
                },
                ctrl : {
                    wanted:		false,
                    pressed:	e.ctrlKey ? true : false
                },
                alt  : {
                    wanted:		false,
                    pressed:	e.altKey ? true : false
                },
                meta : { //Meta is Mac specific
                    wanted:		false,
                    pressed:	e.metaKey ? true : false
                }
            };
            // Foreach keys in label (split on +)
            for(var i=0, l=keys.length; k=keys[i],i<l; i++) {
                switch (k) {
                    case 'ctrl':
                    case 'control':
                        kp++;
                        modifiers.ctrl.wanted = true;
                        break;
                    case 'shift':
                    case 'alt':
                    case 'meta':
                        kp++;
                        modifiers[k].wanted = true;
                        break;
                }

                if (k.length > 1) { // If it is a special key
                    if(special_keys[k] == code) kp++;
                } else if (opt['keyCode']) { // If a specific key is set into the config
                    if (opt['keyCode'] == code) kp++;
                } else { // The special keys did not match
                    if(character == k) kp++;
                    else {
                        if(shift_nums[character] && e.shiftKey) { // Stupid Shift key bug created by using lowercase
                            character = shift_nums[character];
                            if(character == k) kp++;
                        }
                    }
                }
            }

            if(kp == keys.length &&
                modifiers.ctrl.pressed == modifiers.ctrl.wanted &&
                modifiers.shift.pressed == modifiers.shift.wanted &&
                modifiers.alt.pressed == modifiers.alt.wanted &&
                modifiers.meta.pressed == modifiers.meta.wanted) {
                $timeout(function() {
                    callback(e);
                }, 1);

                if(!opt['propagate']) { // Stop the event
                    // e.cancelBubble is supported by IE - this will kill the bubbling process.
                    e.cancelBubble = true;
                    e.returnValue = false;

                    // e.stopPropagation works in Firefox.
                    if (e.stopPropagation) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                    return false;
                }
            }

        };
        // Store shortcut
        keyboardManagerService.keyboardEvent[label] = {
            'callback': fct,
            'target':   elt,
            'event':    opt['type']
        };
        //Attach the function with the event
        if(elt.addEventListener) elt.addEventListener(opt['type'], fct, false);
        else if(elt.attachEvent) elt.attachEvent('on' + opt['type'], fct);
        else elt['on' + opt['type']] = fct;
    };
    // Remove the shortcut - just specify the shortcut and I will remove the binding
    keyboardManagerService.unbind = function (label) {
        label = label.toLowerCase();
        var binding = keyboardManagerService.keyboardEvent[label];
        delete(keyboardManagerService.keyboardEvent[label])
        if(!binding) return;
        var type		= binding['event'],
            elt			= binding['target'],
            callback	= binding['callback'];
        if(elt.detachEvent) elt.detachEvent('on' + type, callback);
        else if(elt.removeEventListener) elt.removeEventListener(type, callback, false);
        else elt['on'+type] = false;
    };
    //
    return keyboardManagerService;
}]);
