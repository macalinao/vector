// http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function Clouds(game) {
    this.game = game;
    this.x = 0;
    this.y = 50;
    this.speed = 100;
}

Clouds.prototype.update = function(delta) {
    this.x -= this.speed * (delta / 1000);
    if (this.x < -this.game.canvas.width) {
        this.x = 0;
    }
};

Clouds.prototype.draw = function() {
    this.game.ctx.drawImage(this.game.assets.images.clouds, this.x, this.y, this.game.canvas.width, this.game.canvas.height / 4);
    this.game.ctx.drawImage(this.game.assets.images.clouds, this.x + this.game.canvas.width, this.y, this.game.canvas.width, this.game.canvas.height / 4);
};

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

    this.width = 100;
    this.height = 100;

    this.x = 50;
    this.y = this.state.game.canvas.height - this.height;

    this.speed = 300;
    this.health = 10;

    this.hurting = false;
    this.doneTime = 0;

    this.update = function(delta) {
        if (this.health <= 0) {
            this.state.game.switchState("gameover");
        }

        if (this.state.direction == -1) {
            if (this.x > 0) {
                this.x -= this.speed * (delta / 1000);
            }
        }

        if (this.state.direction == 1) {
            if (this.x < this.state.game.canvas.width - this.width) {
                this.x += this.speed * (delta / 1000);
            }
        }

        if (this.hurting && this.doneTime < Date.now()) {
            this.hurting = false;
        }
    };

    this.draw = function() {
        var game = this.state.game;

        if (this.hurting) {
            game.ctx.drawImage(game.assets.images.shiphit, this.x, this.y, this.width, this.height);
        } else {
            game.ctx.drawImage(game.assets.images.ship, this.x, this.y, this.width, this.height);
        }
    };

    this.drawHealth = function() {
        var game = this.state.game;

        var healthBarTop = 50;

        var healthBarStart = game.canvas.width / 9;
        
        var healthBarFull = game.canvas.width * (7 / 9);
        var healthBarEnd = healthBarFull * (this.health / 10);

        var healthBarHeight = game.canvas.height / 16;

        game.ctx.fillStyle = "#ff0000";
        game.ctx.fillRect(healthBarStart, healthBarTop, healthBarFull, healthBarHeight);

        game.ctx.fillStyle = "#00ff00";
        game.ctx.fillRect(healthBarStart, healthBarTop, healthBarEnd, healthBarHeight);
    }

    this.hurt = function(laser) {
        //TODO play sound
        this.hurting = true;
        this.doneTime = Date.now() + 200;
        this.health -= 1;
    };
}

function LaserManager(state) {
    this.state = state;
    this.lastSpawn = Date.now();
    this.lasers = [];

    this.fireLaser = function() {
        var x = Math.random() * this.state.game.canvas.width - 50;
        var y = -100;

        var type = Math.random() * 100;

        var width;
        var height;
        var color;
        var speed;

        if (type < 50) {
            color = {r: 255, g: 0, b: 0};
            speed = 300;
            width = 10;
            height = 50;
        } else if (type < 70) {
            color = {r: 0, g: 255, b: 0};
            speed = 600;
            width = 20;
            height = 20;
        } else if (type < 90) {
            color = {r: 0, g: 0, b: 255};
            speed = 20;
            width = 100;
            height = 10;
        } else if (type <= 100) {
            color = {r: 255, g: 255, b: 255};
            speed = 1000;
            width = 5;
            height = 5;
        }

        this.lasers.push(new Laser(this.state, {
            x: x,
            y: y,
            speed: speed,
            color: color,
            width: width,
            height: height
        }));
    };

    this.update = function(delta) {
        // Spawn lasers
        var now = Date.now();
        if (now - this.lastSpawn > 1000) {
            this.fireLaser();
            this.lastSpawn = now;
        }

        // Update lasers
        for (var i = 0; i < this.lasers.length; i++) {
            var laser = this.lasers[i];
            laser.update(delta);

            // Check for pepper eat
            if (laser.intersects(this.state.ship)) {
                this.lasers.splice(i, 1);
                this.state.ship.hurt(laser);
                continue;
            }

            if (laser.y > this.state.game.canvas.height) {
                this.lasers.splice(i, i);
            }
        }
    };

    this.draw = function() {
        for (var i = 0; i < this.lasers.length; i++) {
            this.lasers[i].draw();
        }
    };
}

function Laser(state, params) {
    this.state = state;
    this.x = params.x;
    this.y = params.y;

    this.width = params.width;
    this.height = params.height;

    this.color = rgbToHex(params.color.r, params.color.g, params.color.b);
    this.speed = params.speed;
}

Laser.prototype.update = function update(delta) {
    this.y += this.speed * (delta / 1000);
};

Laser.prototype.draw = function draw() {
    this.state.game.ctx.fillStyle = this.color;
    this.state.game.ctx.fillRect(this.x, this.y, this.width, this.height);
}

Laser.prototype.intersects = function intersects(rect) {
    return (this.x <= rect.x + rect.width
        && rect.x <= this.x + this.width
        && this.y <= rect.y + rect.height
        && rect.y <= this.y + this.height);
};

var StateInGame = function StateInGame() {
};

StateInGame.prototype.enter = function enter() {
    this.ship = new Ship(this);
    this.laserManager = new LaserManager(this);
    this.game.globals.startTime = Date.now();
};

StateInGame.prototype.update = function update(delta) {
    backgroundUpdate(this.game, delta);
    this.ship.update(delta);
    this.laserManager.update(delta);
};

StateInGame.prototype.render = function render() {
    backgroundRender(this.game);
    this.ship.draw();
    this.laserManager.draw();
    this.ship.drawHealth();

    var ctx = this.game.ctx;

    ctx.font = "40px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Time: " + ((Date.now() - this.game.globals.startTime) / 1000), 20, 40);

    // Draw reds
    for (var i = 0; i < this.reds; i++) {
        ctx.drawImage(this.game.assets.images.redpepper, this.game.canvas.width - 50 - (i * 50), 5);
    }
};

StateInGame.prototype.touchHandlers = [
    function checkLeft(touch) {
        if (touch.type == 'start' && Engin.Input.inRectBounds(
            [
                [0, 0],
                [screen.width / 2, screen.height]
            ], touch)) {
            this.direction = (this.direction == 1) ? 0 : -1;
        }
    },

    function checkRight(touch) {
        if (touch.type == 'start' && Engin.Input.inRectBounds(
            [
                [screen.width / 2, 0],
                [screen.width, screen.height]
            ], touch)) {
            this.direction = (this.direction == -1) ? 0 : 1;        }
    },

    function checkStop(touch) {
        if (touch.type == 'end') {
            this.direction = 0;
        }
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
            images: ["title", "ship", "shiphit"],
            sounds: ["bg", "hit"]
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
    game.globals.clouds = new Clouds(game);
    game.initialize(canvas);

    game.start();
});
