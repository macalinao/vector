// http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function backgroundUpdate(game, delta) {
    // game.globals.clouds.update(delta);
}

function backgroundRender(game) {
    // game.ctx.drawImage(game.assets.images.bg, 0, 0, game.canvas.width, game.canvas.height);
    // game.globals.clouds.draw();
    game.ctx.fillStyle = "#000000";
    game.ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
}

/**
 * Main menu state
 */
var StateMainMenu = function StateMainMenu() {
};

StateMainMenu.prototype.enter = function enter() {
    this.game.assets.sounds.bg.play();
    this.game.assets.sounds.bg.startLooping();
};

StateMainMenu.prototype.update = function update(delta) {
    backgroundUpdate(this.game, delta);
};

StateMainMenu.prototype.render = function render() {
    backgroundRender(this.game);
    this.game.ctx.drawImage(this.game.assets.images.title, 0, 0, this.game.canvas.width, this.game.canvas.height);
};

StateMainMenu.prototype.touchHandlers = [
    function onTouch(touch) {
        if (touch.type == "start") {
            this.game.switchState("ingame");
        }
    }
];

/**
 * In-game state
 */

/**
 * The ship
 * @param {[type]} state [description]
 */
function Ship(state) {
    this.state = state;

    this.dead = false;

    this.width = 50;
    this.height = 50;

    this.x = 50;
    this.y = (this.state.game.canvas.height - this.height) / 2;

    this.speed = this.state.game.canvas.height * 2.718281828;
    this.momentum = 0;

    this.hurting = false;
    this.doneTime = 0;

    this.update = function(delta) {
        if (this.dead) {
            this.state.game.switchState("gameover");
        }

        this.momentum -= this.speed * (delta / 1000) / 2;

        if (this.state.holding) {
            this.momentum += this.speed * (delta / 1000);
        }

        this.y -= this.momentum * (delta / 1000);

        if (this.y < 50 || this.y > this.state.game.canvas.height - this.height - 50) {
            this.dead = true;
        }
    };

    this.draw = function() {
        var game = this.state.game;
        var ctx = game.ctx;

        ctx.strokeStyle = "#00ff00";

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.stroke();
    };
}

function WallManager(state) {
    this.state = state;
    this.lastSpawn = Date.now();
    this.walls = [];

    this.spawnWall = function() {
        var x = this.state.game.canvas.width + 100;
        var y = Math.random() * this.state.game.canvas.height - 50;

        var type = Math.random() * 100;

        var width;
        var height;
        var color;

        if (type < 50) {
            color = {r: 255, g: 0, b: 0};
            width = 5;
            height = 50;
        } else if (type < 70) {
            color = {r: 0, g: 255, b: 0};
            width = 20;
            height = 20;
        } else if (type < 90) {
            color = {r: 0, g: 0, b: 255};
            width = 10;
            height = 100;
        } else if (type <= 100) {
            color = {r: 255, g: 255, b: 255};
            width = 200;
            height = 10;
        }

        this.walls.push(new Wall(this.state, {
            x: x,
            y: y,
            color: color,
            width: width,
            height: height
        }));
    };

    this.update = function(delta) {
        // Spawn walls
        var now = Date.now();
        if (now - this.lastSpawn > 500) {
            this.spawnWall();
            this.lastSpawn = now;
        }

        // Update walls
        for (var i = 0; i < this.walls.length; i++) {
            var wall = this.walls[i];
            wall.update(delta);

            // Check for wall hit
            if (wall.intersects(this.state.ship)) {
                this.walls.splice(i, 1);
                this.state.ship.dead = true;
                continue;
            }

            if (wall.y > this.state.game.canvas.height) {
                this.walls.splice(i, i);
            }
        }
    };

    this.draw = function() {
        for (var i = 0; i < this.walls.length; i++) {
            this.walls[i].draw();
        }
    };
}

function Wall(state, params) {
    this.state = state;
    this.x = params.x;
    this.y = params.y;

    this.width = params.width;
    this.height = params.height;

    this.color = rgbToHex(params.color.r, params.color.g, params.color.b);
    this.speed = state.game.canvas.width / 5;
}

Wall.prototype.update = function update(delta) {
    this.x -= this.speed * (delta / 1000);
};

Wall.prototype.draw = function draw() {
    this.state.game.ctx.fillStyle = this.color;
    this.state.game.ctx.fillRect(this.x, this.y, this.width, this.height);
}

Wall.prototype.intersects = function intersects(rect) {
    return (this.x <= rect.x + rect.width
        && rect.x <= this.x + this.width
        && this.y <= rect.y + rect.height
        && rect.y <= this.y + this.height);
};

var StateInGame = function StateInGame() {
};

StateInGame.prototype.enter = function enter() {
    this.ship = new Ship(this);
    this.wallManager = new WallManager(this);
    this.game.globals.startTime = Date.now();
};

StateInGame.prototype.update = function update(delta) {
    backgroundUpdate(this.game, delta);
    this.ship.update(delta);
    this.wallManager.update(delta);
};

StateInGame.prototype.render = function render() {
    backgroundRender(this.game);
    this.ship.draw();
    this.wallManager.draw();

    var ctx = this.game.ctx;

    ctx.fillStyle = "#00ff00";
    ctx.fillRect(0, 0, this.game.canvas.width, 50);
    ctx.fillRect(0, this.game.canvas.height - 50, this.game.canvas.width, 50);

    ctx.font = "40px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("Time: " + ((Date.now() - this.game.globals.startTime) / 1000), 20, 40);
};

StateInGame.prototype.touchHandlers = [
    function checkGo(touch) {
        this.holding = touch.type == 'start';
    },

    function checkStop(touch) {
        this.holding = !(touch.type == 'end');
    }
];

var StateGameOver = function StateGameOver() {
};

StateGameOver.prototype.enter = function enter() {
    this.game.globals.seconds = (Date.now() - this.game.globals.startTime) / 1000;
};

StateGameOver.prototype.render = function render() {
    backgroundRender(this.game);

    var ctx = this.game.ctx;
    ctx.font = "40px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("You lived for " + this.game.globals.seconds + " seconds.", this.game.canvas.width / 2 - 300, this.game.canvas.height / 3);
    ctx.fillText("Click anywhere to try again.", this.game.canvas.width / 2 - 300, this.game.canvas.height / 2)
};

StateGameOver.prototype.touchHandlers = [
    function backToMainMenu(touch) {
        if (touch.type == 'start') {
            this.game.switchState('initial');
        }
    }
];

// Temp workaround for Ripple
var hasReadied = false;

document.addEventListener("webworksready", function() {
// $(function() {
    if (hasReadied) {
        return;
    }
    hasReadied = true;
    
    var game = new Engin.Game({
        platform: Engin.Platform.WEBWORKS,
        assets: {
            images: ["title"],
            sounds: ["bg"]
        }
    });

    var canvas = document.getElementById("game");
    canvas.width = document.width;
    canvas.height = document.height;

    game.defineStates({
        initial: StateMainMenu,
        ingame: StateInGame,
        gameover: StateGameOver
    });
    game.initialize(canvas);

    game.start();
});
