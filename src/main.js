function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

class Input {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0
        };
    }

    keyDown(e) {
        this.keys[e.code] = true;
    }

    keyUp(e) {
        this.keys[e.code] = false;
    }

    mouseMove(e) {
        this.mouse.x = e.offsetX;
        this.mouse.y = e.offsetY;
    }

    mouseDown(e) {
        this.mouse[e.button] = true;
    }

    mouseUp(e) {
        this.mouse[e.button] = false;
    }
}

class Box {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    middle() {
        return new Vector(this.x + this.w / 2, this.y + this.h / 2);
    }

    intersects(box, threshold = 0) {
        return this.x + this.w - threshold > box.x &&
            this.x + threshold < box.x + box.w &&
            this.y + this.h - threshold > box.y &&
            this.y + threshold < box.y + box.h;
    }
}

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

const input = new Input();

const enemyTemplate = {
    b: new Box(0, 0, 64, 64),
    d: new Vector(3, 3),

    sprite: loadImage('assets/img/zombie.png')
}

const enemiesPool = [];

const player = {
    b: new Box(0, 0, 64, 64),
    d: new Vector(0, 0),
    v: 4,
    wv: 6,

    sprite: loadImage('assets/img/player.png')
}

const bulletTemplate = {
    b: new Box(0, 0, 8, 8),
    d: new Vector(0, 0),

    sprite: loadImage('assets/img/bullet.png')
}
const bulletsPool = [];

const cursor = {
    b: new Box(0, 0, 32, 32),

    sprite: loadImage('assets/img/crosshair.png')
};

const targetInterval = 1000 / 60;
let previousTimestamp = null;
let nextShootTimestamp = null;
let dt = 1;

const canvas = document.querySelector('canvas');

canvas.addEventListener('mousemove', input.mouseMove.bind(input));
canvas.addEventListener('mousedown', input.mouseDown.bind(input));
canvas.addEventListener('mouseup', input.mouseUp.bind(input));
window.addEventListener('keydown', input.keyDown.bind(input));
window.addEventListener('keyup', input.keyUp.bind(input));

function generateEnemies() {
    for(let i = 0; i < (Math.random() + 1) * 3; i++) {
        const v = Math.random() * 2 + 1;
        enemiesPool.push({
            ...enemyTemplate,
            b: new Box(Math.random() * canvas.width, Math.random() * canvas.height, enemyTemplate.b.w, enemyTemplate.b.h),
            d: new Vector(v, v),
        })
    }
}

setInterval(generateEnemies, 3 * 1000);
generateEnemies()

const ctx = canvas.getContext('2d');

const render = (timestamp) => {
    cursor.b.x = input.mouse.x;
    cursor.b.y = input.mouse.y;

    player.d.x = 0;
    player.d.y = 0;

    if (input.keys['KeyW']) {
        player.d.y += -player.v * dt;
    }

    if (input.keys['KeyS']) {
        player.d.y += player.v * dt;
    }

    if (input.keys['KeyA']) {
        player.d.x += -player.v * dt;
    }

    if (input.keys['KeyD']) {
        player.d.x += player.v * dt;
    }

    if (nextShootTimestamp === null) {
        nextShootTimestamp = timestamp;
    }

    // Shoot.
    if (input.mouse[0] && nextShootTimestamp <= timestamp) {
        const bullet = {
            ...bulletTemplate,
            b: new Box(player.b.middle().x - bulletTemplate.b.w / 2, player.b.middle().y - bulletTemplate.b.h / 2, bulletTemplate.b.w, bulletTemplate.b.h),
            d: new Vector(cursor.b.x - player.b.middle().x, cursor.b.y - player.b.middle().y)
        };

        const magnitude = Math.sqrt(bullet.d.x * bullet.d.x + bullet.d.y * bullet.d.y);
        bullet.d.x /= magnitude;
        bullet.d.y /= magnitude;

        bulletsPool.push(bullet);

        nextShootTimestamp = timestamp + 1000 / player.wv;
    }

    if (enemiesPool.length === 0) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

        ctx.fillStyle = 'black';
        ctx.font = '48px serif';
        ctx.fillText('You win!', 10, 50);

        return;
    }

    if (previousTimestamp === null) {
        previousTimestamp = timestamp;
    }

    const elapsed = timestamp - previousTimestamp;

    if (elapsed >= targetInterval) {
        dt = elapsed / targetInterval;
        previousTimestamp = timestamp;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

        player.b.x = Math.max(0, Math.min(player.b.x + player.d.x, canvas.width - player.b.w));
        player.b.y = Math.max(0, Math.min(player.b.y + player.d.y, canvas.height - player.b.h));

        // Render the player.
        ctx.translate(player.b.middle().x, player.b.middle().y);
        // Flip to the lower right quadrant.
        ctx.rotate((Math.atan2( cursor.b.y - player.b.middle().y,  cursor.b.x - player.b.middle().x) * 180 / Math.PI + 90) / 180 * Math.PI)
        ctx.drawImage(player.sprite, 0, 0, player.sprite.width, player.sprite.height, -player.b.w / 2, -player.b.h / 2, player.b.w, player.b.h);
        ctx.resetTransform();

        // Render the crosshair.
        ctx.translate(cursor.b.middle().x, cursor.b.middle().y);
        ctx.drawImage(cursor.sprite, 0, 0, cursor.sprite.width, cursor.sprite.height, -cursor.b.w, -cursor.b.h, cursor.b.w, cursor.b.h);
        ctx.resetTransform();

        // Render the bullets.
        bulletsPool.forEach((bullet, index) => {
            bullet.b.x = bullet.b.x + bullet.d.x * 10;
            bullet.b.y = bullet.b.y + bullet.d.y * 10;

            if (bullet.b.x < 0 || bullet.b.x > canvas.width || bullet.b.y < 0 || bullet.b.y > canvas.height) {
                bulletsPool.splice(index, 1);
                return
            }

            ctx.translate(bullet.b.middle().x, bullet.b.middle().y);
            // Flip to the lower right quadrant.
            ctx.rotate((Math.atan2( bullet.d.y,  bullet.d.x) * 180 / Math.PI + 90) / 180 * Math.PI)
            ctx.drawImage(bullet.sprite, 0, 0, bullet.sprite.width, bullet.sprite.height, -bullet.b.w / 2, -bullet.b.h / 2, bullet.b.w, bullet.b.h);
            ctx.resetTransform();

            // Check for collisions.
            enemiesPool.forEach((enemy, enemyIndex) => {
                if (bullet.b.intersects(enemy.b, 25)) {
                    bulletsPool.splice(index, 1);
                    enemiesPool.splice(enemyIndex, 1);
                }
            });
        });

        // Render the enemies.
        enemiesPool.forEach((enemy, index) => {
            const enemyAngle = Math.atan2( player.b.middle().y - enemy.b.middle().y,  player.b.middle().x - enemy.b.middle().x);

            if (!enemy.b.intersects(player.b, 25)) {
                enemy.b.x = Math.max(0, Math.min(enemy.b.x + enemy.d.x * Math.cos(enemyAngle), canvas.width - enemy.b.w));
                enemy.b.y = Math.max(0, Math.min(enemy.b.y + enemy.d.y * Math.sin(enemyAngle), canvas.height - enemy.b.h));
            }

            ctx.translate(enemy.b.middle().x, enemy.b.middle().y);
            // Flip to the lower right quadrant.
            ctx.rotate((enemyAngle * 180 / Math.PI + 90) / 180 * Math.PI)
            ctx.drawImage(enemy.sprite, 0, 0, enemy.sprite.width, enemy.sprite.height, -enemy.b.w / 2, -enemy.b.h / 2, enemy.b.w, enemy.b.h);
            ctx.resetTransform();

            // ctx.strokeStyle = 'red';
            // ctx.strokeRect(enemy.b.x, enemy.b.y, enemy.b.w, enemy.b.h);
        });

        // ctx.strokeStyle = 'red';
        // ctx.strokeRect(player.b.x, player.b.y, player.b.w, player.b.h);
    }

    window.requestAnimationFrame(render);
}

window.requestAnimationFrame(render);
