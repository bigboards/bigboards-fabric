var Q = require('q'),
    kv = require('../store/kv'),
    fs = require('../utils/fs-utils');


module.exports = {
    kvToFs: kvToFs
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


