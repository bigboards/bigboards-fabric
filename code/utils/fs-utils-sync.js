var Q = require('q'),
    fs = require('fs'),
    yaml = require("js-yaml"),
    ini = require('ini'),
    swig = require('swig'),
    mkdirp = require('mkdirp');

var log4js = require('log4js');
var logger = log4js.getLogger('utils.fs');

var renderer = new swig.Swig({
    varControls: ['[[', ']]'],
    tagControls: ['[%', '%]'],
    cmtControls: ['[#', '#]'],
    locals: {
        isRelativePath: function(path) {
            return path.indexOf('/') != 0;
        },
        startsWith: function(str, prefix) {
            return str.indexOf(prefix) != 0;
        },
        isFalsy: function(value) {
            if (value == 0) return true;
            if (value == false) return true;
            if (value == "false") return true;
            if (value == {}) return true;
            if (value == "") return true;
            if (value == null) return true;
            if (value == undefined) return true;

            return false;
        },
        isDirectory: isDirectory,
        isFile: isFile,
        parentFileName: parentFileName
    }
});

/**********************************************************************************************************************
 ** GENERAL
 *********************************************************************************************************************/
module.exports.absolute = absolute;
module.exports.exists = exists;
module.exports.fileName = fileName;
module.exports.parentFileName = parentFileName;
module.exports.mkdir = mkdir;
module.exports.isDirectory = isDirectory;
module.exports.isFile = isFile;
module.exports.rmdir = rmdir;
module.exports.readDir = readDir;

function absolute(path) {
    var p = path;
    if (p.indexOf('/') != 0) p = '/' + p;

    return process.cwd() + p;
}

function exists(path) {
    return  fs.existsSync(path);
}

function fileName(path) {
    if (path) {
        var start = path.lastIndexOf("/")+1;
        var end = path.length;
        return path.substring(start, end);
    }

    return undefined;
}

function parentFileName(path) {
    var idx = path.lastIndexOf('/');
    return (idx == -1) ? path : path.substring(0, idx);
}

/**********************************************************************************************************************
 ** DIRECTORIES
 *********************************************************************************************************************/
function readDir(path) {
    return fs.readdirSync(path);
}

function mkdir(path) {
    return mkdirp.sync(path);
}

function isDirectory(path) {
    return fs.statSync(path).isDirectory();
}

function isFile(path) {
    return fs.statSync(path).isFile();
}

function rmdir(path) {
    var deleteFolderRecursive = function(path) {
        if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function(file,index){
                var curPath = path + "/" + file;
                if(fs.lstatSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    };

    return deleteFolderRecursive(path);
}

/**********************************************************************************************************************
 ** TEMPLATING
 *********************************************************************************************************************/

module.exports.generateDir = generateDir;
module.exports.generateFile = generateFile;

function generateFile(templatePath, targetPath, variables) {
    logger.info('Generating ' + templatePath + ' to ' + targetPath);
    var content = renderer.renderFile(templatePath, variables);

    if (!content || content == "") {
        logger.warn('No content to be written!');
        writeFile(targetPath, "");
    } else {
        writeFile(targetPath, content);
    }
}

function generateDir(pathContainingTemplates, targetPath, variables) {
    logger.info('Generating directory ' + pathContainingTemplates + ' to ' + targetPath);

    var dirContents = readDir(pathContainingTemplates);
    dirContents.forEach(function(child) {
        if (isDirectory(pathContainingTemplates + '/' + child)) {
            // -- also create the directory in the target path
            mkdir(targetPath + '/' + child);
            generateDir(pathContainingTemplates + '/' + child, targetPath + '/' + child, variables);
        } else {
            generateFile(pathContainingTemplates + '/' + child, targetPath + '/' + child, variables);
        }
    });
}

/**********************************************************************************************************************
 ** PLAIN FILES
 *********************************************************************************************************************/
module.exports.readFile = readFile;
module.exports.writeFile = writeFile;

function readFile(file) {
    return fs.readFileSync(file, 'utf8');
}

function writeFile(file, content) {
    return fs.writeFileSync(file, content, 'utf8');
}

/**********************************************************************************************************************
 ** YAML FILES
 *********************************************************************************************************************/
module.exports.readYamlFile = readYamlFile;
module.exports.writeYamlFile = writeYamlFile;

function readYamlFile(file) {
    return yaml.safeLoad(readFile(file));
}

function writeYamlFile(file, obj) {
    return writeFile(file, yaml.safeDump(obj));
}

/**********************************************************************************************************************
 ** JSON FILES
 *********************************************************************************************************************/
module.exports.readJsonFile = readJsonFile;
module.exports.writeJsonFile = writeJsonFile;

function readJsonFile(file) {
    return JSON.parse(readFile(file));
}

function writeJsonFile(path, obj) {
    writeFile(path, JSON.stringify(obj));
}

/**********************************************************************************************************************
 ** INI FILES
 *********************************************************************************************************************/
module.exports.readIniFile = readIniFile;
module.exports.writeIniFile = writeIniFile;

function readIniFile(file) {
    return ini.parse(readFile(file));
}

function writeIniFile(path, obj) {
    writeFile(path, ini.stringify(obj, { whitespace: true }));
}