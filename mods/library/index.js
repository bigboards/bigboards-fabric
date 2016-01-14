var fs = require("fs"),
    yaml = require("js-yaml"),
    Q = require("q"),
    exec = require('child_process').exec,
    request = require('request'),
    winston = require('winston'),
    rest = require('restler');

function Library(libraryLocation) {
    this.libraryLocation = libraryLocation;
    this.libraryContent = {};
    this.refresh();
}

Library.prototype.get = function(tintId) {
    var deferrer = Q.defer();
    var self = this;

    if (! this.libraryContent || this.libraryContent.length == 0) {
        this.refresh().then(function(data) {
            var tint = getFromLibrary(self.libraryContent, tintId);

            if (tint) deferrer.resolve(tint);
            else deferrer.reject(new Error('Unable to find the tint with id ' + tintId, 'not-found-error'));
        }, function(error) {
            deferrer.reject(error);
        });
    } else {
        var tint = getFromLibrary(self.libraryContent, tintId);

        if (tint) deferrer.resolve(tint);
        else deferrer.reject(new Error('Unable to find the tint with id ' + tintId, 'not-found-error'));
    }

    return deferrer.promise;
};

/**
 * List the tints currently inside the library.
 */
Library.prototype.list = function() {
    var deferrer = Q.defer();
    var self = this;

    if (!this.libraryContent || this.libraryContent.length == 0) {
        this.refresh().then(function(data) {
            deferrer.resolve(data);
        }, function(error) {
            deferrer.reject(error);
        });
    } else {
        deferrer.resolve(self.libraryContent);
    }

    return deferrer.promise;
};

/**
 * Load the library content from persistent storage.
 */
Library.prototype.refresh = function() {
    var deferrer = Q.defer();
    var self = this;

    request(this.libraryLocation + '/library.json', function(error, response, body) {
        if (error) return deferrer.reject(error);

        self.libraryContent = JSON.parse(body);

        return deferrer.resolve(self.libraryContent);
    });

    return deferrer.promise;
};

function getFromLibrary(library, id) {
    for (var i = 0; i < library.length; i++)
        if (library[i].id == id) return library[i];

    return null;
}

module.exports = Library;
