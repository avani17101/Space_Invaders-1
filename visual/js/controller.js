/**
 * The visualization controller will works as a state machine.
 * See files under the `doc` folder for transition descriptions.
 * See https://github.com/jakesgordon/javascript-state-machine
 * for the document of the StateMachine module.
 */
var Controller = StateMachine.create({
    initial: 'none',
    events: [{
        name: 'init',
        from: 'none',
        to: 'ready'
    },
    {
        name: 'search',
        from: 'starting',
        to: 'searching'
    },
    {
        name: 'pause',
        from: 'searching',
        to: 'paused'
    },
    {
        name: 'finish',
        from: 'searching',
        to: 'finished'
    },
    {
        name: 'resume',
        from: 'paused',
        to: 'searching'
    },
    {
        name: 'cancel',
        from: 'paused',
        to: 'ready'
    },
    {
        name: 'modify',
        from: 'finished',
        to: 'modified'
    },
    {
        name: 'reset',
        from: '*',
        to: 'ready'
    },
    {
        name: 'clear',
        from: ['finished', 'modified'],
        to: 'ready'
    },
    {
        name: 'start',
        from: ['ready', 'modified', 'restarting'],
        to: 'starting'
    },
    {
        name: 'restart',
        from: ['searching', 'finished'],
        to: 'restarting'
    },
    {
        name: 'dragStart',
        from: ['ready', 'finished'],
        to: 'draggingStart'
    },
    {
        name: 'dragEnd',
        from: ['ready', 'finished'],
        to: 'draggingEnd'
    },
    {
        name: 'dragCheckpoint',
        from: ['ready', 'finished'],
        to: 'draggingCheckpoint'
    },
    {
        name: 'drawWall',
        from: ['ready', 'finished'],
        to: 'drawingWall'
    },
    {
        name: 'eraseWall',
        from: ['ready', 'finished'],
        to: 'erasingWall'
    },
    {
        name: 'addPit',
        from: ['ready', 'finished'],
        to: 'addingPit'
    },
    {
        name: 'addBomb',
        from: ['ready', 'finished'],
        to: 'addingBomb'
    },
    {
        name: 'addIce',
        from: ['ready', 'finished'],
        to: 'addingIce'
    },
    {
        name: 'rest',
        from: ['draggingStart', 'draggingEnd', 'drawingWall', 'erasingWall', 'addingPit', 'addingIce', 'addingBomb', 'draggingCheckpoint'],
        to: 'ready'
    },
    {
        name: 'startMaze',
        from: 'ready',
        to: 'ready'
    }
    ],
});

$.extend(Controller, {
    gridSize: [64, 36], // number of nodes horizontally and vertically
    draggingEndLock: false,
    checkpoints: [],
    path: [],
    operations: [],
    endstatus: 0,
    currCheckpoint: -1,
    mousemoveflag: 0,
    checkPointsleft: 4,
    numice: 0,
    numpit: 0,
    numbomb: 0,
    /**
     * Asynchronous transition from `none` state to `ready` state.
     */
    onleavenone: function () {
        var numCols = this.gridSize[0],
            numRows = this.gridSize[1];

        this.grid = new PF.Grid(numCols, numRows);

        View.init({
            numCols: numCols,
            numRows: numRows
        });
        View.generateGrid(function () {
            Controller.setDefaultStartEndPos();
            Controller.bindEvents();
            Controller.transition(); // transit to the next state (ready)

        });

        this.$buttons = $('.control_button');
        this.$maze_buttons = $('.maze_button');
        this.$obstacle_buttons = $('.obstacle_button');
        console.log(this.$maze_buttons)
        // this.hookPathFinding();

        return StateMachine.ASYNC;
        // => ready
    },
    ondrawWall: function (event, from, to, gridX, gridY) {
        console.log("drawing wall", gridX, gridY);
        this.setWalkableAt(gridX, gridY, false, "wall");
        // => drawingWall
    },
    oneraseWall: function (event, from, to, gridX, gridY) {
        console.log("erasing wall");
        this.setWalkableAt(gridX, gridY, true, "wall");
        // => erasingWall
    },
    onaddPit: function (event, from, to, gridX, gridY) {
        console.log("adding pit");
        // => addingPit
    },
    onaddIce: function (event, from, to, gridX, gridY) {
        console.log("adding ice");

        // => addingIce
    },
    onaddBomb: function (event, from, to, gridX, gridY) {
        this.setBombAt(gridX, gridY, false);
        console.log("adding bomb");
        // => addingBomb
    },
    pathnotfound: function () {
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
            icon: 'error',
            title: 'Path not found'
        })
    },
    onsearch: function (event, from, to) {
        var grid,
            timeStart, timeEnd,
            finder = Panel.getFinder();
        this.finder = finder;
        this.pathfound = 1;
        var TSP = new PF.TSP({
            startX: this.startX,
            startY: this.startY,
            endX: this.endX,
            endY: this.endY,
            checkpoints: this.checkpoints,
            grid: this.grid,
            finder: this.finder
        })
        res = TSP.onTSP()
        this.checkpoints = res[0]
        this.pathfound = res[1]
        for (var i = -1; i < this.checkpoints.length; i++) {
            if (i == -1) {
                var originX = this.startX;
                var originY = this.startY;
            } else {
                var originX = this.checkpoints[i].x;
                var originY = this.checkpoints[i].y;
            }
            if (i == this.checkpoints.length - 1) {
                var destX = this.endX;
                var destY = this.endY
            } else {
                var destX = this.checkpoints[i + 1].x;
                var destY = this.checkpoints[i + 1].y;
            }

            this.finder = finder;
            timeStart = window.performance ? performance.now() : Date.now();
            grid = this.grid.clone();
            var res = finder.findPath(
                originX, originY, destX, destY, grid
            );
            this.path = this.path.concat(res['path']);
            this.operations = this.operations.concat(res['operations']);
            console.log("Path nd operations")
            console.log(this.path)
            console.log(this.operations)
            if (this.path.length == 1) {
                this.pathfound = 0
                break;
            }
            this.operationCount = this.operations.length;
            timeEnd = window.performance ? performance.now() : Date.now();
            this.timeSpent = (timeEnd - timeStart).toFixed(4);
            this.loop();
            // break;
        }
        console.log(this.current)
        if (!this.pathfound)
            this.finish()
        // if(this.checkpoints.length == 0){

        // }
        // else{

        //     console.log(this.checkpoints.length)
        // }
        // => searching
    },
    onrestart: function () {
        // When clearing the colorized nodes, there may be
        // nodes still animating, which is an asynchronous procedure.
        // Therefore, we have to defer the `abort` routine to make sure
        // that all the animations are done by the time we clear the colors.
        // The same reason applies for the `onreset` event handler.
        this.endstatus = 0;
        setTimeout(function () {
            Controller.clearOperations();
            Controller.clearFootprints();
            Controller.start();
        }, View.nodeColorizeEffect.duration * 1.2);
        this.numbomb = 0;
        this.numice = 0;
        this.numpit = 0;
        // => restarting
    },
    onpause: function (event, from, to) {
        // => paused
    },
    onresume: function (event, from, to) {
        this.loop();
        // => searching
    },
    oncancel: function (event, from, to) {
        this.clearOperations();
        this.clearFootprints();
        // => ready
    },
    onfinish: function (event, from, to) {
        if (!this.pathfound) {
            this.pathnotfound()
        } else {
            View.showStats({
                pathLength: PF.Util.pathLength(this.path),
                timeSpent: this.timeSpent,
                operationCount: this.operationCount,
            });
            View.drawPath(this.path);
            alert("Congratulations, base found! Click ok to render, you can also drag the start, end, checkpoints, obstacles to see dynamically rendered path!");
        }
        this.endstatus = 1;
        this.path = [];
        this.operations = [];
        // => finished
    },
    onclear: function (event, from, to) {
        this.clearOperations();
        this.clearFootprints();
        // => ready
    },
    onmodify: function (event, from, to) {
        // => modified
    },
    onreset: function (event, from, to) {
        this.endstatus = 0;
        setTimeout(function () {
            Controller.clearOperations();
            Controller.clearAll();
            Controller.buildNewGrid();
        }, View.nodeColorizeEffect.duration * 1.2);
        this.setButtonStates({
            id: 3,
            enabled: true,
        });
        this.numbomb = 0;
        this.numice = 0;
        this.numpit = 0;
        // => ready
    },

    /**
     * The following functions are called on entering states.
     */
    clearAllCheckPoints: function () {
        console.log("Clearing all checkpoints!");
        for (let i = 0; i < this.checkpoints.length; i++)
            View.setCheckPoint(this.checkpoints[i].x, this.checkpoints[i].y, -1, -1, false);
        // this.setWalkableAt(this.checkpoints[i].x, this.checkpoints[i].y, true, "wall");
        this.checkpoints.splice(0, this.checkpoints.length);
        console.log("leftover checkpoints:", this.checkpoints);
        this.checkPointsleft = 4;
        if (this.endstatus == 1)
            this.findPath(1);
    },
    initmaze: function (mazetype) {
        this.mazetype = mazetype;
        this.startMaze();
    },
    onready: function () {
        console.log('=> ready');
        this.setButtonStates({
            id: 0,
            text: 'Start Search',
            enabled: true,
            callback: $.proxy(this.start, this),
        }, {
            id: 1,
            text: 'Pause Search',
            enabled: false,
        }, {
            id: 2,
            text: 'Clear Obstacles',
            enabled: true,
            callback: $.proxy(this.reset, this),
        }, {
            id: 3,
            text: 'Clear checkpoints',
            enabled: true,
            callback: $.proxy(this.clearAllCheckPoints, this),
        });
        this.setButtonStatesMaze({
            id: 0,
            text: 'Random maze',
            enabled: true,
            callback: $.proxy(this.initmaze, this, 'random'),
        }, {
            id: 1,
            text: 'Recursive maze',
            enabled: true,
            callback: $.proxy(this.initmaze, this, 'recursive'),
        }, {
            id: 2,
            text: 'Stair maze',
            enabled: true,
            callback: $.proxy(this.initmaze, this, 'stair'),
        });
        this.setButtonStatesObstacles({
            id: 1,
            text: 'Add Bomb',
            enabled: true,
            callback: $.proxy(this.addBomb, this)
        }, {
            id: 2,
            text: 'Add Ice',
            enabled: true,
            callback: $.proxy(this.addIce, this)
        }, {
            id: 3,
            text: 'Add Pit',
            enabled: true,
            callback: $.proxy(this.addPit, this)

        })
        // => [starting, draggingStart, draggingEnd, draggingPit drawingStart, drawingEnd]
    },
    createMazeWall: function (event, x, y) {

        event.setWalkableAt(x, y, false);
    },
    // loop: function () {
    //     var interval = 1000 / this.operationsPerSecond;
    //     (function loop() {
    //         var mazeWalls = this.mazeWalls
    //         do {
    //             if (!mazeWalls.length) {
    //                 this.finish(); // transit to `finished` state
    //                 return;
    //             }
    //             mz = mazeWalls.shift();
    //             this.setWalkableAt(mz['x'], mz['y'], false);
    //             isSupported = View.supportedOperations.indexOf(op.attr) !== -1;
    //         } while (!isSupported);
    //         setTimeout(loop, interval);
    //     })();
    // },
    onstartMaze: function (event, from, to) {
        //this.mazeWalls = []
        this.endstatus = 0;
        var mazetype = this.mazetype
        Controller.clearOperations();
        Controller.clearAll();
        Controller.buildNewGrid();
        this.setButtonStates({
            id: 3,
            enabled: true,
        });
        this.setButtonStates({
            id: 6,
            enabled: false,
        });
        console.log(this.gridSize[0], this.gridSize[1]);
        var rows = this.gridSize[0];
        var cols = this.gridSize[1];
        if (mazetype == 'random') {
            maze = new PF.RandomMaze({
                xlim: rows,
                ylim: cols,
                startX: this.startX,
                startY: this.startY,
                endX: this.endX,
                endY: this.endY,
                controller: this
            });
        } else if (mazetype == 'recursive') {
            maze = new PF.RecDivMaze({
                xlim: rows,
                ylim: cols,
                startX: this.startX,
                startY: this.startY,
                endX: this.endX,
                endY: this.endY,
                controller: this
            });
        } else if (mazetype == 'stair') {
            maze = new PF.StairMaze({
                xlim: rows,
                ylim: cols,
                startX: this.startX,
                startY: this.startY,
                endX: this.endX,
                endY: this.endY,
                controller: this
            });
        }
        console.log(maze);
        var mazewall = maze.findmaze();
        for (let i = 0; i < mazewall.length; i++) {
            //this.createMazeWall(mazewall[i].x,mazewall[i].y);
            setTimeout(this.createMazeWall, 3, this, mazewall[i].x, mazewall[i].y);
        }
        // while (x < this.gridSize[0]) {
        //     while (y < this.gridSize[1]) {
        //         if ((x == this.startX && y == this.startY) || (x == this.endX && y == this.endY))
        //             y++;
        //         else if (Math.random() > 0.8) {
        //             this.mazeWalls.push({
        //                 x: x,
        //                 y: y
        //             });
        //             setTimeout(this.createMazeWall, 300, this, x, y);
        //             y++;
        //         } else {
        //             y++;
        //         }
        //     }
        //     y = 0;
        //     x++;
        // }
        //View.clearBlockedNodes();
    },
    onstarting: function (event, from, to) {
        console.log('=> starting');
        this.endstatus = 0;
        // Clears any existing search progress
        this.clearFootprints();
        this.setButtonStates({
            id: 1,
            enabled: true,
        });
        this.search();
        // => searching
    },
    onsearching: function () {

        console.log('=> searching');
        this.setButtonStates({
            id: 0,
            text: 'Restart Search',
            enabled: true,
            callback: $.proxy(this.restart, this),
        }, {
            id: 1,
            text: 'Pause Search',
            enabled: true,
            callback: $.proxy(this.pause, this),
        });
        // => [paused, finished]
    },
    onpaused: function () {
        console.log('=> paused');
        this.setButtonStates({
            id: 0,
            text: 'Resume Search',
            enabled: true,
            callback: $.proxy(this.resume, this),
        }, {
            id: 1,
            text: 'Cancel Search',
            enabled: true,
            callback: $.proxy(this.cancel, this),
        });
        // => [searching, ready]
    },
    onfinished: function () {
        console.log('=> finished');
        this.setButtonStates({
            id: 0,
            text: 'Restart Search',
            enabled: true,
            callback: $.proxy(this.restart, this),
        }, {
            id: 1,
            text: 'Clear Path',
            enabled: true,
            callback: $.proxy(this.clear, this),
        });
    },
    onmodified: function () {
        console.log('=> modified');
        this.setButtonStates({
            id: 0,
            text: 'Start Search',
            enabled: true,
            callback: $.proxy(this.start, this),
        }, {
            id: 1,
            text: 'Clear Path',
            enabled: true,
            callback: $.proxy(this.clear, this),
        });
    },

    /**
     * Define setters and getters of PF.Node, then we can get the operations
     * of the pathfinding.
     */
    hookPathFinding: function () {

        //     PF.Node.prototype = {
        //         get opened() {
        //             return this._opened;
        //         },
        //         set opened(v) {
        //             this._opened = v;
        //             Controller.operations.push({
        //                 x: this.x,
        //                 y: this.y,
        //                 attr: 'opened',
        //                 value: v
        //             });
        //         },
        //         get closed() {
        //             return this._closed;
        //         },
        //         set closed(v) {
        //             this._closed = v;
        //             Controller.operations.push({
        //                 x: this.x,
        //                 y: this.y,
        //                 attr: 'closed',
        //                 value: v
        //             });
        //         },
        //         get tested() {
        //             return this._tested;
        //         },
        //         set tested(v) {
        //             this._tested = v;
        //             Controller.operations.push({
        //                 x: this.x,
        //                 y: this.y,
        //                 attr: 'tested',
        //                 value: v
        //             });
        //         },
        //     };

        this.operations = [];
    },
    bindEvents: function () {
        $('#draw_area').mousedown($.proxy(this.mousedown, this));
        $(window)
            .mousemove($.proxy(this.mousemove, this))
            .mouseup($.proxy(this.mouseup, this));
    },
    loop: function () {

        speed = Panel.getSpeed();
        var operationsPerSecond = speed * 5;


        var interval = 1000 / operationsPerSecond;
        (function loop() {
            if (!Controller.is('searching')) {
                return;
            }
            Controller.step();
            setTimeout(loop, interval);
        })();
    },
    step: function () {
        var operations = this.operations,
            op, isSupported;

        do {
            if (!operations.length) {
                this.finish(); // transit to `finished` state

                return;
            }
            op = operations.shift();
            isSupported = View.supportedOperations.indexOf(op.attr) !== -1;
        } while (!isSupported);

        View.setAttributeAt(op.x, op.y, op.attr, op.value, false);
    },
    clearOperations: function () {
        this.operations = [];
        this.path = []
    },
    clearFootprints: function () {
        View.clearFootprints();
        View.clearPath();
    },
    clearCheckPoint: function (gridX, gridY) {
        const ind = this.checkpoints.findIndex(node =>
            node.x == gridX &&
            node.y == gridY
        );
        console.log(ind);
        if (ind != -1) {
            this.checkpoints.splice(ind, 1);
        }
        this.checkPointsleft++;
        this.grid.setWalkableAt(gridX, gridY, true, "");
        View.setCheckPoint(gridX, gridY, -1, -1, false);
        // this.setWalkableAt(gridX, gridY, true, "wall");
        if (this.endstatus == 1)
            this.findPath(1);
    },
    clearAll: function () {
        this.clearFootprints();
        View.clearBlockedNodes();
    },
    buildNewGrid: function () {
        this.grid = new PF.Grid(this.gridSize[0], this.gridSize[1]);
    },
    mousedown: function (event) {
        var coord = View.toGridCoordinate(event.pageX, event.pageY),
            gridX = coord[0],
            gridY = coord[1],
            grid = this.grid;
        if ((event.ctrlKey) && this.isCheckPoint(gridX, gridY) != -1) {
            console.log("Remove checkpoint!");
            this.clearCheckPoint(gridX, gridY);
            this.checkPointsleft++;
            return;
        } else if (event.ctrlKey) {
            if (!this.isStartOrEndPos(gridX, gridY) && grid.isWalkableAt(gridX, gridY) && this.checkPointsleft > 0) {
                this.setCheckPoint(gridX, gridY, true);
                this.checkPointsleft--;
            }
        } else {
            if (this.can('dragStart') && this.isStartPos(gridX, gridY)) {
                this.dragStart();
                return;
            }
            if (this.can('dragEnd') && this.isEndPos(gridX, gridY)) {
                this.dragEnd();
                return;
            }
            if (this.can('dragCheckpoint') && this.isCheckPoint(gridX, gridY) != -1) {
                this.currCheckpoint = this.isCheckPoint(gridX, gridY)
                this.dragCheckpoint();
                return;
            }
            // if (this.can('dragEndFinished') && this.isEndPos(gridX, gridY)) {
            //     this.dragEndFinished();
            //     return;
            // }
            if (this.can('drawWall') && grid.isWalkableAt(gridX, gridY)) {
                this.drawWall(gridX, gridY);
                return;
            }
            if (this.can('eraseWall') && !grid.isWalkableAt(gridX, gridY)) {
                this.eraseWall(gridX, gridY);
            }

            if (this.can('addBomb') && grid.isWalkableAt(gridX, gridY)) {
                this.addBomb(100, 100);
                return;
            }

            if (this.can('addPit') && grid.isWalkableAt(gridX, gridY)) {
                this.addPit(gridX, gridY);
                return;
            }
            if (this.can('addIce') && grid.isWalkableAt(gridX, gridY)) {
                this.addIce(gridX, gridY);
                return;
            }
            if (this.can('dragStart') && this.isStartPos(gridX, gridY)) {
                this.dragStart();
                return;
            }
            if (this.can('dragEnd') && this.isEndPos(gridX, gridY)) {
                this.dragEnd();
                return;
            }
        }

    },
    findPath: function (viewoperations) {
        this.clearOperations();
        this.clearFootprints();
        var path = [];
        var operations = [];
        var TSP = new PF.TSP({
            startX: this.startX,
            startY: this.startY,
            endX: this.endX,
            endY: this.endY,
            checkpoints: this.checkpoints,
            grid: this.grid,
            finder: this.finder
        })
        if (this.currCheckpoint != -1) {
            var checkx = this.checkpoints[this.currCheckpoint].x
            var checky = this.checkpoints[this.currCheckpoint].y
        }
        res = TSP.onTSP()
        this.checkpoints = res[0]
        this.pathfound = res[1]
        // this.checkpoints, this.pathfound = TSP.onTSP()
        if (this.currCheckpoint != -1) {
            for (var i = 0; i < this.checkpoints.length; i++)
                if (checkx == this.checkpoints[i].x && checky == this.checkpoints[i].y) {
                    this.currCheckpoint = i;
                    break;
                }
        }
        // this.pathfound = 1;
        console.log(this.pathfound)
        for (var i = -1; i < this.checkpoints.length; i++) {
            if (i == -1) {
                var originX = this.startX;
                var originY = this.startY;
            } else {
                var originX = this.checkpoints[i].x;
                var originY = this.checkpoints[i].y;
            }
            if (i == this.checkpoints.length - 1) {
                var destX = this.endX;
                var destY = this.endY
            } else {
                var destX = this.checkpoints[i + 1].x;
                var destY = this.checkpoints[i + 1].y;
            }
            var grid = this.grid.clone();
            var res = this.finder.findPath(
                originX, originY, destX, destY, grid
            );
            console.log("path:", res['path'])
            if (!res['path'] || res['path'].length == 1) {
                this.pathfound = 0
                console.log("path not")
                break;
            }
            path = path.concat(res['path'])
            operations = operations.concat(res['operations'])
        }
        // console.log(res['path'])
        if (this.pathfound) {
            var op, isSupported;
            if (viewoperations) {
                console.log(operations)
                while (operations.length) {
                    op = operations.shift();
                    View.setAttributeAt(op.x, op.y, op.attr, op.value);
                }
            }
            View.drawPath(path);
        }
    },
    mousemove: function (event) {
        var coord = View.toGridCoordinate(event.pageX, event.pageY),
            grid = this.grid,
            gridX = coord[0],
            gridY = coord[1];

        if (this.isStartOrEndPos(gridX, gridY) || this.isCheckPoint(gridX, gridY) != -1) {
            return;
        }

        switch (this.current) {
            case 'draggingStart':
                if (grid.isWalkableAt(gridX, gridY)) {
                    this.mousemoveflag = 1
                    this.setStartPos(gridX, gridY);
                    if (this.endstatus == 1)
                        this.findPath(0)
                }
                break;
            case 'draggingEnd':
                if (grid.isWalkableAt(gridX, gridY)) {
                    this.mousemoveflag = 1
                    this.setEndPos(gridX, gridY);
                    if (this.endstatus == 1)
                        this.findPath(0)
                }
                break;
            case 'draggingCheckpoint':
                if (grid.isWalkableAt(gridX, gridY)) {
                    this.mousemoveflag = 1
                    View.setCheckPoint(gridX, gridY, this.checkpoints[this.currCheckpoint].x, this.checkpoints[this.currCheckpoint].y, true)
                    this.checkpoints[this.currCheckpoint].x = gridX;
                    this.checkpoints[this.currCheckpoint].y = gridY;
                    if (this.endstatus == 1) {
                        this.findPath(0)
                    }
                }
                break;
            case 'drawingWall':
                this.setWalkableAt(gridX, gridY, false, "wall");
                break;
            case 'erasingWall':
                this.setWalkableAt(gridX, gridY, true, "wall");
                break;
            case 'addingPit':
                this.setPitAt(gridX, gridY, false);
                break;
            case 'addingBomb':
                this.setBombAt(gridX, gridY, false);
                break;
            case 'addingIce':
                this.setIceAt(gridX, gridY, false);
                break;
        }
    },
    mouseup: function (event) {
        if (Controller.can('rest')) {
            var state = this.current;
            Controller.rest();
            var coord = View.toGridCoordinate(event.pageX, event.pageY),
                grid = this.grid,
                gridX = coord[0],
                gridY = coord[1];
            switch (state) {
                case 'draggingStart':
                    if (grid.isWalkableAt(gridX, gridY) && !this.isEndPos(gridX, gridY) && this.isCheckPoint(gridX, gridY) == -1) {
                        this.setStartPos(gridX, gridY);
                        if (this.endstatus == 1)
                            this.findPath(1)
                    }
                    break;
                case 'draggingEnd':
                    if (grid.isWalkableAt(gridX, gridY) && !this.isStartPos(gridX, gridY) && this.isCheckPoint(gridX, gridY) == -1) {
                        this.setEndPos(gridX, gridY);
                        if (this.endstatus == 1)
                            this.findPath(1)
                    }
                    break;
                case 'draggingCheckpoint':
                    if (grid.isWalkableAt(gridX, gridY) && !this.isStartOrEndPos(gridX, gridY)) {
                        View.setCheckPoint(gridX, gridY, this.checkpoints[this.currCheckpoint].x, this.checkpoints[this.currCheckpoint].y, true)
                        this.checkpoints[this.currCheckpoint].x = gridX;
                        this.checkpoints[this.currCheckpoint].y = gridY;
                        if (this.endstatus == 1) {
                            this.findPath(1)
                        }
                    }
                    break;
            }
        }
    },
    setButtonStates: function () {
        $.each(arguments, function (i, opt) {
            console.log("Button id:", opt.id)
            var optid = opt.id;
            // if (opt.id == 7) {
            //     optid = 0;
            // }

            var $button = Controller.$buttons.eq(optid);
            if (opt.text) {
                $button.text(opt.text);
            }
            if (opt.callback) {
                $button
                    .unbind('click')
                    .click(opt.callback);
            }
            if (opt.enabled === undefined) {
                return;
            } else if (opt.enabled) {
                $button.removeAttr('disabled');
            } else {
                $button.attr({ disabled: 'disabled' });
            }
        });
    },
    setButtonStatesMaze: function () {
        $.each(arguments, function (i, opt) {

            var optid = opt.id;
            console.log(opt)
            var $button = Controller.$maze_buttons.eq(optid);
            if (opt.text) {
                $button.text(opt.text);
            }
            if (opt.callback) {
                $button
                    .unbind('click')
                    .click(opt.callback);
            }
            if (opt.enabled === undefined) {
                return;
            } else if (opt.enabled) {
                $button.removeAttr('disabled');
            } else {
                $button.attr({ disabled: 'disabled' });
            }
        });
    },
    setButtonStatesObstacles: function () {
        $.each(arguments, function (i, opt) {

            var optid = opt.id;
            console.log(opt)
            var $button = Controller.$obstacle_buttons.eq(optid - 1);
            if (opt.text) {
                $button.text(opt.text);
            }
            if (opt.callback) {
                $button
                    .unbind('click')
                    .click(opt.callback);
            }
            if (opt.enabled === undefined) {
                return;
            } else if (opt.enabled) {
                $button.removeAttr('disabled');
            } else {
                $button.attr({ disabled: 'disabled' });
            }
        });
    },

    /**
     * When initializing, this method will be called to set the positions
     * of start node and end node.
     * It will detect user's display size, and compute the best positions.
     */
    setDefaultStartEndPos: function () {
        var width, height,
            marginRight, availWidth,
            centerX, centerY,
            endX, endY,
            nodeSize = View.nodeSize;

        width = $(window).width();
        height = $(window).height();

        marginRight = $('#algorithm_panel').width();
        availWidth = width - marginRight;

        centerX = Math.ceil(availWidth / 2 / nodeSize);
        centerY = Math.floor(height / 2 / nodeSize);

        this.setStartPos(centerX - 5, centerY);
        this.setEndPos(centerX + 5, centerY);
    },
    setStartPos: function (gridX, gridY) {
        this.startX = gridX;
        this.startY = gridY;
        View.setStartPos(gridX, gridY);
    },
    setEndPos: function (gridX, gridY) {
        this.endX = gridX;
        this.endY = gridY;
        View.setEndPos(gridX, gridY);
    },
    setWalkableAt: function (gridX, gridY, walkable, pit) {
        this.grid.setWalkableAt(gridX, gridY, walkable, pit);
        View.setAttributeAt(gridX, gridY, 'walkable', walkable, "wall");
    },
    setCheckPoint: function (gridX, gridY) {
        this.checkpoints.push({
            x: gridX,
            y: gridY
        })
        // View.setAttributeAt(gridX, gridY, 'checkpoint', true);
        View.setCheckPoint(gridX, gridY, -1, -1, true)
    },
    setPitAt: function (gridX, gridY, walkable) {
        if (this.numpit < 5) {
            this.grid.setWalkableAt(gridX, gridY, walkable);
            View.setAttributeAt(gridX, gridY, 'walkable', walkable, "pit");
            this.setPitArea(gridX - 1, gridY, walkable);
            this.setPitArea(gridX - 2, gridY, walkable);
            this.setPitArea(gridX + 1, gridY, walkable);
            this.setPitArea(gridX + 2, gridY, walkable);
            this.numpit += 1;
        }


    },
    setPitArea: function (gridX, gridY, walkable) {
        this.grid.setWalkableAt(gridX, gridY, walkable);
        View.setAttributeAt(gridX, gridY, 'walkable', walkable, "pitarea");
    },
    setIceAt: function (gridX, gridY, walkable) {
        if (this.numice < 5) {
            this.grid.setWalkableAt(gridX, gridY, walkable);
            View.setAttributeAt(gridX, gridY, 'walkable', walkable, "ice");
            this.setIceArea(gridX - 1, gridY + 1, walkable);
            this.setIceArea(gridX + 1, gridY + 1, walkable);
            this.numice += 1;

        }
    },
    setIceArea: function (gridX, gridY, walkable) {
        this.grid.setWalkableAt(gridX, gridY, walkable);
        View.setAttributeAt(gridX, gridY, 'walkable', walkable, "icearea");
    },
    setBombAt: function (gridX, gridY, walkable) {
        if (this.numbomb < 5) {
            this.grid.setWalkableAt(gridX, gridY, walkable);
            View.setAttributeAt(gridX, gridY, 'walkable', walkable, "bomb");
            this.setBombArea(gridX - 1, gridY, walkable);
            this.setBombArea(gridX, gridY - 1, walkable);
            this.setBombArea(gridX + 1, gridY, walkable);
            this.setBombArea(gridX, gridY + 1, walkable);
            this.numbomb += 1;
        }
    },
    setBombArea: function (gridX, gridY, walkable) {
        this.grid.setWalkableAt(gridX, gridY, walkable);
        View.setAttributeAt(gridX, gridY, 'walkable', walkable, "bombarea");
    },
    isStartPos: function (gridX, gridY) {
        return gridX === this.startX && gridY === this.startY;
    },
    isEndPos: function (gridX, gridY) {
        return gridX === this.endX && gridY === this.endY;
    },
    isCheckPoint: function (gridX, gridY) {
        return this.checkpoints.findIndex(node => node.x == gridX && node.y == gridY);
    },
    isStartOrEndPos: function (gridX, gridY) {
        return this.isStartPos(gridX, gridY) || this.isEndPos(gridX, gridY);
    },

});