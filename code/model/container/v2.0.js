var log4js = require('log4js');
var logger = log4js.getLogger('docker.model.mapper.2_0');

module.exports =  function(definition) {
    logger.debug(definition);

    return definition;
}