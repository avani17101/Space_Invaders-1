/**
 * The pathfinding visualization.
 * It uses raphael.js to show the grids.
 * It handles most of the inputs and outputs in the Raphael grid.
 */

var View = {
    checkpoint: [],
    nodeSize: 30, // width and height of a single node, in pixel
    nodeStyle: {
        normal: {
            fill: '#CFCFCF',
            'stroke-opacity': 0.6, // the border
        },
        blocked: {
            fill: '#47101E',
            'stroke-opacity': 0.2,
        },
        start: {
            fill: 'url("images/moon-rover.png")',
            'stroke-opacity': 0.2,
        },
        end: {
            fill: 'url("images/pin.png")',
            'stroke-opacity': 0.2,
        },
        opened: {
            fill: '#AD3C3C',
            'stroke-opacity': 0.2,
        },
        closed: {
            fill: '#D8B3B3',
            'stroke-opacity': 0.2,
        },
        failed: {
            fill: '#ff8888',
            'stroke-opacity': 0.2,
        },
        tested: {
            fill: '#000066',
            'stroke-opacity': 0.2,
        },
        checkpoint: {
            fill: 'url("images/flag.png")',
            'stroke-opacity': 0.2,
        }
    },
    nodeColorizeEffect: {
        duration: 50,
    },

    nodeZoomEffect: {
        duration: 200,
        transform: 's1.2', // scale by 1.2x
        transformBack: 's1.0',
    },
    pathStyle: {
        stroke: '#FFFDBD',
        'stroke-width': 7,
    },
    supportedOperations: ['opened', 'closed', 'tested'],
    init: function (opts) {
        this.numCols = opts.numCols;
        this.numRows = opts.numRows;
        this.paper = Raphael('draw_area');
        this.$stats = $('#stats');
    },
    /**
     * Generate the grid asynchronously.
     * This method will be a very expensive task.
     * Therefore, in order to not to block the rendering of browser ui,
     * We decomposed the task into smaller ones. Each will only generate a row.
     */
    generateGrid: function (callback) {
        // It is used to generate the grid. 
        var i, j, x, y,
            rect,
            normalStyle, nodeSize,
            createRowTask, sleep, tasks,
            nodeSize = this.nodeSize,
            normalStyle = this.nodeStyle.normal,
            numCols = this.numCols,
            numRows = this.numRows,
            paper = this.paper,
            rects = this.rects = [],
            $stats = this.$stats;

        paper.setSize(numCols * nodeSize, numRows * nodeSize);

        createRowTask = function (rowId) {
            return function (done) {
                rects[rowId] = [];
                for (j = 0; j < numCols; ++j) {
                    x = j * nodeSize;
                    y = rowId * nodeSize;

                    rect = paper.rect(x, y, nodeSize, nodeSize);
                    rect.attr(normalStyle);
                    rects[rowId].push(rect);
                }
                done(null);
            };
        };

        sleep = function (done) {
            setTimeout(function () {
                done(null);
            }, 0);
        };

        tasks = [];
        for (i = 0; i < numRows; ++i) {
            tasks.push(createRowTask(i));
            tasks.push(sleep);
        }

        async.series(tasks, function () {
            if (callback) {
                callback();
            }
        });
    },
    setStartPos: function (gridX, gridY) {
        // Sets the start position at the co-ordinates(gridX, gridY)
        var coord = this.toPageCoordinate(gridX, gridY);
        if (!this.startNode) {
            this.startNode = this.paper.rect(
                    coord[0],
                    coord[1],
                    this.nodeSize,
                    this.nodeSize
                ).attr(this.nodeStyle.normal)
                .animate(this.nodeStyle.start, 1000);
        } else {
            this.startNode.attr({
                x: coord[0],
                y: coord[1]
            }).toFront();
        }
    },
    setCheckPoint: function (gridX, gridY, oldX, oldY, value) {
        // Sets the checckpoint position at the co-ordinates(gridX, gridY)
        var coord = this.toPageCoordinate(gridX, gridY);
        if (value) {
            if (this.checkpoint.findIndex(node => node.x == oldX && node.y == oldY) == -1) {
                this.checkpoint.push({
                    x: gridX,
                    y: gridY,
                    paper_el: this.paper.rect(
                            coord[0],
                            coord[1],
                            this.nodeSize,
                            this.nodeSize
                        ).attr(this.nodeStyle.checkpoint)
                        .animate(this.nodeStyle.checkpoint, 1000)
                })
            } else {
                checkindex = this.checkpoint.findIndex(node => node.x == oldX && node.y == oldY);
                this.checkpoint[checkindex].x = gridX;
                this.checkpoint[checkindex].y = gridY;
                this.checkpoint[checkindex].paper_el.attr({
                    x: coord[0],
                    y: coord[1]
                }).toFront();
            }
        } else {
            if (this.checkpoint.findIndex(node => node.x == gridX && node.y == gridY) != -1) {
                checkindex = this.checkpoint.findIndex(node => node.x == gridX && node.y == gridY);
                node = this.rects[gridY][gridX].clone()
                this.rects[gridY][gridX].remove()
                node.attr(this.nodeStyle.normal)
                this.rects[gridY][gridX] = node
                this.checkpoint.splice(checkindex, 1);
            }
        }
    },
    setEndPos: function (gridX, gridY) {
        // Sets the destination position at the co-ordinates(gridX, gridY)
        var coord = this.toPageCoordinate(gridX, gridY);
        if (!this.endNode) {
            this.endNode = this.paper.rect(
                    coord[0],
                    coord[1],
                    this.nodeSize,
                    this.nodeSize
                ).attr(this.nodeStyle.normal)
                .animate(this.nodeStyle.end, 1000);
        } else {
            this.endNode.attr({
                x: coord[0],
                y: coord[1]
            }).toFront();
        }
    },
    /**
     * Set the attribute of the node at the given coordinate.
     */
    setAttributeAt: function (gridX, gridY, attr, value, ob) {
        var color, nodeStyle = this.nodeStyle;
        switch (attr) {
            case 'walkable':
                color = value ? nodeStyle.normal.fill : nodeStyle.blocked.fill;
                this.setWalkableAt(gridX, gridY, value, ob);
                break;
            case 'opened':
                this.colorizeNode(this.rects[gridY][gridX], nodeStyle.opened.fill);
                this.setCoordDirty(gridX, gridY, true);
                break;
            case 'closed':
                this.colorizeNode(this.rects[gridY][gridX], nodeStyle.closed.fill);
                this.setCoordDirty(gridX, gridY, true);
                break;
            case 'tested':
                color = (value === true) ? nodeStyle.tested.fill : nodeStyle.normal.fill;
                this.colorizeNode(this.rects[gridY][gridX], color);
                this.setCoordDirty(gridX, gridY, true);
                break;
            default:
                console.error('unsupported operation: ' + attr + ':' + value);
                return;
        }
    },
    colorizeNode: function (node, color) {
        // Fill the node with a particular colour
        node.animate({
            fill: color
        }, this.nodeColorizeEffect.duration);
    },

    zoomNode: function (node) {
        node.toFront().attr({
            transform: this.nodeZoomEffect.transform,
        }).animate({
            transform: this.nodeZoomEffect.transformBack,
        }, this.nodeZoomEffect.duration);
    },
    setWalkableAt: function (gridX, gridY, value, ob) {
        // Sets the walkable status of a particular node
        var node, i, blockedNodes = this.blockedNodes;
        if (!blockedNodes) {
            blockedNodes = this.blockedNodes = new Array(this.numRows);
            for (i = 0; i < this.numRows; ++i) {
                blockedNodes[i] = [];
            }
        }
        node = blockedNodes[gridY][gridX];
        if (value) {
            // clear blocked node
            if (node) {

                this.colorizeNode(node, this.rects[gridY][gridX].attr('fill'));
                this.zoomNode(node);
                setTimeout(function () {
                    node.remove();
                }, this.nodeZoomEffect.duration);
                blockedNodes[gridY][gridX] = null;
            }
        } else {
            // draw blocked node
            if (node) {
                return;
            }
            node = blockedNodes[gridY][gridX] = this.rects[gridY][gridX].clone();
            if (ob == "wall") {
                this.colorizeNode(node, this.nodeStyle.blocked.fill);
            }
            this.zoomNode(node);
        }
    },
    clearFootprints: function () {
        // Clears the visited and tested nodes.
        var i, x, y, coord, coords = this.getDirtyCoords();
        for (i = 0; i < coords.length; ++i) {
            coord = coords[i];
            x = coord[0];
            y = coord[1];
            this.rects[y][x].attr(this.nodeStyle.normal);
            this.setCoordDirty(x, y, false);
        }
    },
    clearBlockedNodes: function () {
        // Clears the obstacles
        var i, j, blockedNodes = this.blockedNodes;
        if (!blockedNodes) {
            return;
        }
        for (i = 0; i < this.numRows; ++i) {
            for (j = 0; j < this.numCols; ++j) {
                if (blockedNodes[i][j]) {
                    blockedNodes[i][j].remove();
                    blockedNodes[i][j] = null;
                }
            }
        }
    },
    drawPath: function (path) {
        // Draws the path from start to end when a path is found
        if (!path.length) {
            return;
        }
        var svgPath = this.buildSvgPath(path);
        this.path = this.paper.path(svgPath).attr(this.pathStyle);
    },
    /**
     * Given a path, build its SVG represention.
     */
    buildSvgPath: function (path) {
        var i, strs = [],
            size = this.nodeSize;

        strs.push('M' + (path[0][0] * size + size / 2) + ' ' +
            (path[0][1] * size + size / 2));
        for (i = 1; i < path.length; ++i) {
            strs.push('L' + (path[i][0] * size + size / 2) + ' ' +
                (path[i][1] * size + size / 2));
        }

        return strs.join('');
    },
    clearPath: function () {
        // Clear the path
        if (this.path) {
            this.path.remove();
        }
    },
    /**
     * Helper function to convert the page coordinate to grid coordinate
     */
    toGridCoordinate: function (pageX, pageY) {
        return [
            Math.floor(pageX / this.nodeSize),
            Math.floor(pageY / this.nodeSize)
        ];
    },
    /**
     * helper function to convert the grid coordinate to page coordinate
     */
    toPageCoordinate: function (gridX, gridY) {
        return [
            gridX * this.nodeSize,
            gridY * this.nodeSize
        ];
    },
    showStats: function (opts) {
        // Show the length, time and the number of operations in a toast notification at the bottom right corner.
        var texts = [

            '<b>Length: </b>' + Math.round(opts.pathLength * 100) / 100,
            '<b>Time: </b>' + opts.timeSpent + 'ms',
            '<b>Operations: </b>' + opts.operationCount
        ];
        const Toast = Swal.mixin({
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 10000,
            timerProgressBar: true,
            onOpen: (to) => {
                to.addEventListener('mouseenter', Swal.stopTimer)
                to.addEventListener('mouseleave', Swal.resumeTimer)
            }
        })
        Toast.fire({
            icon: 'success',
            html: texts.join('<br>')
        })
    },
    setCoordDirty: function (gridX, gridY, isDirty) {
        var x, y,
            numRows = this.numRows,
            numCols = this.numCols,
            coordDirty;

        if (this.coordDirty === undefined) {
            coordDirty = this.coordDirty = [];
            for (y = 0; y < numRows; ++y) {
                coordDirty.push([]);
                for (x = 0; x < numCols; ++x) {
                    coordDirty[y].push(false);
                }
            }
        }
        this.coordDirty[gridY][gridX] = isDirty;
    },
    getDirtyCoords: function () {
        var x, y,
            numRows = this.numRows,
            numCols = this.numCols,
            coordDirty = this.coordDirty,
            coords = [];

        if (coordDirty === undefined) {
            return [];
        }

        for (y = 0; y < numRows; ++y) {
            for (x = 0; x < numCols; ++x) {
                if (coordDirty[y][x]) {
                    coords.push([x, y]);
                }
            }
        }
        return coords;
    },
};