# Space_Invaders

# Project 1: NAVIGATE THE MARS ROVER
Help the Mars Curiosity Rover find the shortest path between two points while avoiding obstacles on the way. ####


## Introduction
------------
This is the Javascript based webgame for navigating the mars rover using various pathfinding algorithms.

## Features

* Multiple Destinations
	* ctrl+ click on board cells to add checkpoints.
	* The agent covers the checkpoints in shortest path order and reaches destination.
	* Rendering using Travelling salesmen algorithm.
	
* Dynamic Rendering of path through just drag and drop
	The shortest path is dynamically visible if user even after search is over drags the nodes.
	
* Speed of visualization
	Three different speeds for pathfinder: Fast, Medium, Slow

* Mutiple Obstacles
	* Ice, Pits, Bombs
	* Click on respective buttons then click on cells where you want to add the obstacle.

* Different Algorithms
	New 	
	 * Collaborative Learning Agents
	 * Travelling salesmen

* Music loop in game

	

Server
------

If you want to use it in Node.js, you may install it via `npm`.

```bash
npm install pathfinding
```

Then, in your program:

```javascript
var PF = require('pathfinding');
```

See the `Basic Usage` section below for usage details.


Browser
-------

If you have bower installed then you can install it with the following command:

```bash
bower install pathfinding
```

By default bower will install pathfinding under the bower_components folder, so to include it in your page do something like:

```html
<script type="text/javascript" src="path/to/bower_components/pathfinding/pathfinding-browser.min.js"></script>
```

You can also grab a release from the [Releases Page](https://github.com/imor/pathfinding-bower/releases) if you don't use bower.

Basic Usage
-----------

To build a grid-map of width 5 and height 3:

```javascript
var grid = new PF.Grid(5, 3); 
```

By default, all the nodes in the grid will be able to be walked through.
To set whether a node at a given coordinate is walkable or not, use the `setWalkableAt` method.

For example, to set the node at (0, 1) to be un-walkable, where 0 is the x coordinate (from left to right), and 
1 is the y coordinate (from up to down):

```javascript
grid.setWalkableAt(0, 1, false);
```

You may also pass in a matrix while instantiating the `PF.Grid` class.
It will initiate all the nodes in the grid with the same walkability indicated by the matrix.
0 for walkable while 1 for blocked.

```javascript
var matrix = [
    [0, 0, 0, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 1, 0, 0],
];
var grid = new PF.Grid(matrix);
```

Currently there are 10 path-finders bundled in this library, namely:

*  `AStarFinder` *
*  `BestFirstFinder`
*  `BreadthFirstFinder` *
*  `DijkstraFinder` *
*  `IDAStarFinder.js` *
*  `JumpPointFinder` *
*  `OrthogonalJumpPointFinder` *
*  `BiAStarFinder`
*  `BiBestFirstFinder`
*  `BiBreadthFirstFinder` *
*  `BiDijkstraFinder` *
*  `CLAFinder` *

The prefix `Bi` for the last four finders in the above list stands for the bi-directional searching strategy.

Also, Note that only the finders with trailing asterisks are guaranteed to find the shortest path.

To build a path-finder, say, the `AStarFinder`:

```javascript
var finder = new PF.AStarFinder();
```

To find a path from (1, 2) to (4, 2), (Note: both the start point and end point should be walkable):

```javascript
var path = finder.findPath(1, 2, 4, 2, grid);
```

`path` will be an array of coordinates including both the start and end positions.

For the `matrix` defined previously, the `path` will be:

```javascript
[ [ 1, 2 ], [ 1, 1 ], [ 2, 1 ], [ 3, 1 ], [ 3, 2 ], [ 4, 2 ] ]
```

Be aware that `grid` will be modified in each path-finding, and will not be usable afterwards. If you want to use a single grid multiple times, create a clone for it before calling `findPath`.

```javascript
var gridBackup = grid.clone();
```


Advanced Usage
--------------

When instantiating path-finders, you may pass in additional parameters to indicate which specific strategies to use.

For all path-finders, you may indicate whether diagonal movement is allowed. The default value is `false`, which means that the path can only go orthogonally.

In order to enable diagonal movement:

```javascript
var finder = new PF.AStarFinder({
    allowDiagonal: true
});
```

When diagonal movement is enabled, you might want to prevent the path from touching the corners of the occupied grid blocks. This is usually desirable if the objects using the path have physical width and can also move between the grid cells.

To enable the corner crossing prevention:

```javascript
var finder = new PF.AStarFinder({
    allowDiagonal: true,
    dontCrossCorners: true
});
```

Note that `dontCrossCorners` only makes sense when `allowDiagonal` is also used. Currently all algorithms except `JumpPointFinder` support this feature.

For `AStarFinder`, `BestFirstFinder` and all their `Bi` relatives, you may indicate which heuristic function to use.

The predefined heuristics are `PF.Heuristic.manhattan`(default), `PF.Heuristic.chebyshev`, `PF.Heuristic.euclidean` and `PF.Heuristic.octile`.

To use the chebyshev heuristic:

```javascript
var finder = new PF.AStarFinder({
    heuristic: PF.Heuristic.chebyshev
});
```

To build a `BestFirstFinder` with diagonal movement allowed and a custom heuristic function:

```javascript
var finder = new PF.BestFirstFinder({
    allowDiagonal: true,
    heuristic: function(dx, dy) {
        return Math.min(dx, dy);
    }
});
```

To smoothen the path, you may use `PF.Util.smoothenPath`. This routine will return
a new path with the original one unmodified.

```javascript
var newPath = PF.Util.smoothenPath(grid, path);
```

Note that the new path will be compressed as well, i.e. if the original path is
`[[0, 1], [0, 2], [0, 3], [0, 4]]`, then the new path will be `[[0, 1], [0, 4]]`.

To just compress a path without smoothing it, you may use `PF.Util.compressPath`.

```javascript
var newPath = PF.Util.compressPath(path);
```

To expand the compressed path like `[[0, 1], [0, 4]]` back to `[[0, 1], [0, 2], [0, 3], [0, 4]]`,
you may use `PF.Util.expandPath`.

```javascript
var newPath = PF.Util.expandPath(path);
```


Development
------------

Layout:

    .
    |-- lib          # browser distribution
    |-- src          # source code (algorithms only)
    |-- test         # test scripts
    |-- utils        # build scripts
	|-- benchmark    # benchmarks
    `-- visual       # visualization

Make sure you have `node.js` installed, then use `npm` to install the dependencies: 

    npm install -d 

The build system uses gulp, so make sure you have it installed:

    npm install -d -g gulp

To build the browser distribution:

    gulp compile && mv lib/pathfinding-browser.min.js visual/lib

To run the tests
(algorithms only, not including the visualization) with
[mocha](http://mochajs.org/) and [should.js](https://github.com/visionmedia/should.js)
First install mocha:

    npm install -d -g mocha

Then run the tests:

    gulp test

To run the benchmarks:

    gulp bench

Or if you are feeling lazy, the default gulp task does everything(except running the benchmarks):

    gulp

License
-------

[MIT License](http://www.opensource.org/licenses/mit-license.php)

&copy; 2011-2012 Xueqiao Xu &lt;xueqiaoxu@gmail.com&gt;
=======
# Space_Invaders
Repository for project "NAVIGATE THE MARS ROVER" under Microsoft Mars Colonization Program 2020
