var AStarFinder = require('./AStarFinder');
// var Heuristic = require('../core/Heuristic');

/**
 * Best-First-Search path-finder.
 * @constructor
 * @extends AStarFinder
 * @param {Object} opt
 * @param {boolean} opt.allowDiagonal Whether diagonal movement is allowed.
 *     Deprecated, use diagonalMovement instead.
 * @param {boolean} opt.dontCrossCorners Disallow diagonal movement touching
 *     block corners. Deprecated, use diagonalMovement instead.
 * @param {DiagonalMovement} opt.diagonalMovement Allowed diagonal movement.
 * @param {function} opt.heuristic Heuristic function to estimate the distance
 *     (defaults to manhattan).
 */
function CLAFinder(opt) {
    AStarFinder.call(this, opt);
    opt = opt || {};
    if (opt.heuristic == 'poweredManhattan') {
        this.heuristic = function(dx, dy) {
            return Math.pow((dx + dy), 2);
        };
    } else {
        this.heuristic = function(dx, dy) {
            return Math.pow((dx + dy), 10);
        };

    }

}

CLAFinder.prototype = new AStarFinder();
CLAFinder.prototype.constructor = CLAFinder;

module.exports = CLAFinder;