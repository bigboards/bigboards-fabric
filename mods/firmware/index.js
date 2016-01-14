var Q = require('q');
var fs = require('fs');
var stream = require('stream');
var readline = require('readline');
var string_utils = require('../../utils/string-utils')

var Firmware = function(patchesDirectory, versionsFile, tasks) {
    this.patchesDirectory = patchesDirectory;
    this.versionsFile = versionsFile;
    this.tasks = tasks;
};

Firmware.prototype.current = function() {
    return this.currentVersion().then(function(version) {
        return {
            version: version
        };
    });
}

/**
 * Apply the requested patch to the firmware
 *
 * @returns {*}
 */
Firmware.prototype.patch = function(patch) {
    return this.tasks.invoke('patch_install', {patchName: patch});
};

/**
 * Update the firmware to the latest version.
 *
 * @returns {*}
 */
Firmware.prototype.update = function() {
    return this.tasks.invoke('update');
};

/**
 * List the firmware patches.
 *
 * @returns [{name: versions.name, installedOn: versions.timestamp}]
 */
Firmware.prototype.patches = function() {
    var deferred = Q.defer();

    var promises = [];
    promises.push(this.availablePatches());
    promises.push(this.installedPatches());

    Q.all(promises).then(function (results) {
        var result = [];

        // Copy all installed patches to result
        var installedPatches = results[1];
        installedPatches.forEach(function (installedPatch) {
            result.push(installedPatch);
        });

        // Next, complement with available versions, not yet installed
        var availablePatches = results[0];
        availablePatches.forEach(function (availablePatch) {
            if (!result.filter(function(element) { return element.name == availablePatch.name; }).length > 0) {
                result.push(availablePatch);
            }
        });

        // Finally, sort the result
        result.sort(Firmware.comparePatches);

        try {
            return deferred.resolve(result);
        } catch (ex) {
            return deferred.reject(ex)
        }
    }).fail(function(error) {
        return deferred.reject(error)
    });

    return deferred.promise;
};

/**
 * List the available firmware patches.
 *
 * @returns [{name: versions.name, installedOn: versions.timestamp}]
 */
Firmware.prototype.availablePatches = function () {
    var deferred = Q.defer();

    var dir = this.patchesDirectory;
    fs.readdir(dir, function (err, data) {
        if (err) return deferred.reject(err);

        var result = [];
        data.forEach(function (fileName) {
            var fullFileName = string_utils.endsWith(dir, "/") ? dir + fileName : dir + "/" + fileName;
            if (fs.lstatSync(fullFileName).isDirectory()) {
                result.push(Firmware.asPatch(fileName, undefined));
            }
        })

        try {
            return deferred.resolve(result);
        } catch (ex) {
            return deferred.reject(ex)
        }
    });

    return deferred.promise;
};

/**
 * List the installed firmware patches.
 *
 * @returns [{name: versions.name, installedOn: versions.timestamp}]
 */
Firmware.prototype.installedPatches = function() {
    var deferred = Q.defer();
    var result = [];

    var versionsSource = fs.createReadStream(this.versionsFile);
    versionsSource.on('error', function(error) {
        return deferred.reject(error);
    });

    var dummyOutputStream = new stream;
    dummyOutputStream.readable = true;
    dummyOutputStream.writable = true;

    var reader = readline.createInterface({
        input: versionsSource,
        output: dummyOutputStream,
        terminal: false
    });

    reader.on('line', function(line) {
        result.push(Firmware.lineAsPatch(line));
    });
    reader.on('close', function() {
        reader.close();

        try {
            return deferred.resolve(result);
        } catch (ex) {
            return deferred.reject(ex)
        }
    });

    return deferred.promise;
};

/**
 * Retrieve the latest installed patch as version number
 *
 * @type {name: string, installedOn: timestamp} as latest installed patch
 */
Firmware.prototype.currentVersion = function() {
    var deferred = Q.defer();

    this.installedPatches().then(function(installedPatches) {
        installedPatches.sort(Firmware.comparePatches);
        var result = installedPatches[installedPatches.length - 1];

        try {
            return deferred.resolve(result);
        } catch (ex) {
            return deferred.reject(ex)
        }
    });

    return deferred.promise;
}

module.exports = Firmware;

Firmware.asPatch = function(name, installedOn) {
    return {name: name, installedOn: installedOn};
};

Firmware.lineAsPatch = function(line) {
    var pipePosition = line.indexOf('|');
    var patchName = pipePosition >= 0 ? line.substring(0, pipePosition).trim() : line;
    var installedOn = pipePosition >= 0 ? line.substring(pipePosition + 1).trim() : undefined

    patchName = patchName == '' ? undefined : (patchName.substr(-1) === '/') ? patchName.substring(0, patchName.length - 1) : patchName;
    installedOn = installedOn == '' ? undefined : installedOn;

    return Firmware.asPatch(patchName, installedOn);
};

/**
 * Compare patch a and b
 *
 * @param a patch to compare
 * @param b patch to compare with
 * @returns compare first on installedOn (undefined > defined), then by name
 */
Firmware.comparePatches = function(a, b) {
    if (!a.installedOn && b.installedOn)
        return 1;

    if (a.installedOn && !b.installedOn)
        return -1;

    if (a.installedOn < b.installedOn)
        return -1;

    if (a.installedOn > b.installedOn)
        return 1;

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}
