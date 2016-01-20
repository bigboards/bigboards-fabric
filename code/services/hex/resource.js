var ApiUtils = require('../../utils/api-utils'),
    Q = require('q');

function HexResource(hexService) {
    this.hexService = hexService;
}

/**
 * @api {get} /api/v1/hex Request Hex information
 * @apiVersion 1.0.5
 *
 * @apiName GetHex
 * @apiGroup Hex
 * @apiGroupDescription all APIs to fully control your Hex
 *
 * @apiSuccess {String} id      Unique id of the hex.
 * @apiSuccess {String} name    Name of the hex.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *         "id": "cced64d1-1b52-471c-92fe-cca09d8c53e6",
 *         "name": "alice"
 *     }
 */
HexResource.prototype.get = function(req, res) {
    return ApiUtils.handlePromise(res, this.hexService.get());
};

/**
 * @api {delete} /api/v1/hex Prepare the hex for power down.
 * @apiVersion 1.0.5
 *
 * @apiName PowerDownHex
 * @apiGroup Hex
 * @apiGroupDescription all APIs to fully control your Hex
 */
HexResource.prototype.powerdown = function(req, res) {
    return ApiUtils.handlePromise(res, this.hexService.powerdown());
};

/*********************************************************************************************************************
 * LINK
 *********************************************************************************************************************/

/**
 * @api {delete} /api/v1/hex Prepare the hex for power down.
 * @apiVersion 1.0.5
 *
 * @apiName PowerDownHex
 * @apiGroup Hex
 * @apiGroupDescription all APIs to fully control your Hex
 */
HexResource.prototype.link = function(req, res) {
    var token = req.body.token;

    return ApiUtils.handlePromise(res, this.hexService.link(token));
};

HexResource.prototype.unlink = function(req, res) {
    return ApiUtils.handlePromise(res, this.hexService.unlink());
};

/*********************************************************************************************************************
 * NODES
 *********************************************************************************************************************/

/**
 * @api {get} /api/v1/hex/nodes Request the nodes information
 * @apiVersion 1.0.5
 *
 * @apiName GetNodes
 * @apiGroup Hex
 */
HexResource.prototype.listNodes = function(req, res) {
    return ApiUtils.handlePromise(res, this.hexService.listNodes());
};

/*********************************************************************************************************************
 * STACKS
 *********************************************************************************************************************/
/**
 * @api {get} /api/v1/hex/stacks Request the installed stacks
 * @apiVersion 1.0.5
 *
 * @apiName GetStacks
 * @apiGroup HexStack
 * @apiGroupDescription Control the stack tints of your Hex.
 *
 * @apiParam {String} type      Tint type.
 */
HexResource.prototype.listTints = function(req, res) {
    var type = req.param('type');
    //if (!type) return res.send(400, 'No type has been passed!');

    return ApiUtils.handlePromise(res, this.hexService.listTints(type));
};

/**
 * @api {get} /api/v1/hex/stacks/:owner/:tintId Request Stack tint information
 * @apiVersion 1.0.5
 *
 * @apiName GetStack
 * @apiGroup HexStack
 *
 * @apiParam {String} type      Tint type.
 * @apiParam {String} owner     Tint owner.
 * @apiParam {String} tintId    Tint id.
 */
HexResource.prototype.getTint = function(req, res) {
    var type = req.param('type');
    if (!type) return res.send(400, 'No type has been passed!');

    var owner = req.param('owner');
    if (!owner) return res.send(400, 'No owner has been passed!');

    var tintId = req.param('tintId');
    if (!tintId) return res.send(400, 'No tintId has been passed!');

    return ApiUtils.handlePromise(res, this.hexService.getTint(type, owner, tintId));
};

/**
 * @api {get} /api/v1/hex/stacks/:owner/:tintId/:resource Request a specific resource from the tint.
 * @apiVersion 1.0.5
 *
 * @apiName GetTintResource
 * @apiGroup HexStack
 *
 * @apiParam {String} type      Tint type.
 * @apiParam {String} owner     Tint owner.
 * @apiParam {String} tintId    Tint id.
 * @apiParam {String} resource  The resource to retrieve
 */
HexResource.prototype.getTintResource = function(req, res) {
    var type = req.params[0];
    if (!type) return res.send(400, 'No type has been passed!');

    var owner = req.params[1];
    if (!owner) return res.send(400, 'No owner has been passed!');

    var tintId = req.params[2];
    if (!tintId) return res.send(400, 'No tintId has been passed!');

    var resource = req.params[3];
    if (!tintId) return res.send(400, 'No resource has been passed!');

    return ApiUtils.handlePromise(res, this.hexService.getTintResource(type, owner, tintId, resource));
};

/**
 * @api {post} /api/v1/hex/stacks Install a stack tint
 * @apiVersion 1.0.5
 *
 * @apiName InstallStack
 * @apiGroup HexStack
 *
 * @apiParam {String} owner     Tint owner.
 * @apiParam {String} tintId    Tint id.
 * @apiParam {String} uri       URI to the git repo hosting the tint.
 */
HexResource.prototype.installTint = function(req, res) {
    var tint = req.body.tint;
    if (! ApiUtils.isTintWithUri(tint)) return res.send(400, 'No valid tint has been passed!');

    return ApiUtils.handlePromise(res, this.hexService.installTint(tint));
};

/**
 * @api {delete} /api/v1/hex/stacks/:owner/:tintId Remove a Stack tint
 * @apiVersion 1.0.5
 *
 * @apiName RemoveStack
 * @apiGroup HexStack
 *
 * @apiParam {String} type      Tint type.
 * @apiParam {String} owner     Tint owner.
 * @apiParam {String} tintId    Tint id.
 */
HexResource.prototype.removeTint = function(req, res) {
    var type = req.param('type');
    if (!type) return res.send(400, 'No type has been passed!');

    var owner = req.param('owner');
    if (!owner) return res.send(400, 'No owner has been passed!');

    var slug = req.param('slug');
    if (!slug) return res.send(400, 'No slug has been passed!');

    return ApiUtils.handlePromise(res, this.hexService.removeTint(type, owner, slug));
};

module.exports = HexResource;
