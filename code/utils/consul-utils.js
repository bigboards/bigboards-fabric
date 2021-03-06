var Q = require('q'),
    kv = require('../store/kv'),
    fs = require('../utils/fs-utils');

var flags = {
    OPERATION_NEW: 1,
    OPERATION_PENDING: 2,
    OPERATION_OK: 4,
    OPERATION_FAILED: 8,
    CREATE: 16,
    UPDATE: 32,
    REMOVE: 64,
    CLEANUP: 128,
    START: 256,
    STOP: 512
};

module.exports = {
    kvToFs: kvToFs,
    parseFlag: parseFlag,
    flagToName: flagToName,
    flags: flags,
    isFile: isFile,
    isDirectory: isDirectory
};

function kvToFs(pathInConsul, fsPath, variables) {
    function provisionTemplate(pathInConsul, templateKey, fsPath, variables) {
        return kv.raw.get(templateKey).then(function(template) {
            try {
                var filePath = templateKey.substr(pathInConsul.length + 1);

                return fs.generateString(template, fsPath + '/' + filePath, variables);
            } catch (error) {
                return Q.reject(error);
            }
        });
    }

    return kv.list(pathInConsul).then(function(templateKeys) {
        var promises = [];

        templateKeys.forEach(function(templateKey) {
            promises.push(provisionTemplate(pathInConsul, templateKey, fsPath, variables))
        });

        return Q.all(promises);
    });
}

function parseFlag(flag) {
    var operation = null;
    if (flag & flags.CREATE) operation = flags.CREATE;
    else if (flag & flags.UPDATE) operation = flags.UPDATE;
    else if (flag & flags.REMOVE) operation = flags.REMOVE;
    else if (flag & flags.CLEANUP) operation = flags.CLEANUP;
    else if (flag & flags.START) operation = flags.START;
    else if (flag & flags.STOP) operation = flags.STOP;

    var state = null;
    if (flag & flags.OPERATION_NEW) state = flags.OPERATION_NEW;
    else if (flag & flags.OPERATION_PENDING) state = flags.OPERATION_PENDING;
    else if (flag & flags.OPERATION_OK) state = flags.OPERATION_OK;
    else if (flag & flags.OPERATION_FAILED) state = flags.OPERATION_FAILED;

    return { operation: operation, state: state };
}

function flagToName(flag) {
    switch(flag) {
        case flags.OPERATION_NEW: return 'new';
        case flags.OPERATION_PENDING: return 'pending';
        case flags.OPERATION_OK: return 'ok';
        case flags.OPERATION_FAILED: return 'failed';
        case flags.CREATE: return 'create';
        case flags.UPDATE: return 'update';
        case flags.REMOVE: return 'remove';
        case flags.CLEANUP: return 'cleanup';
        case flags.START: return 'start';
        case flags.STOP: return 'stop';
        default: return 'unknown';
    }
}

function isDirectory(key) {
    return (key.lastIndexOf('/') == key.length -1);
}

function isFile(key) {
    return (key.lastIndexOf('/') != key.length -1);
}
