let canv = document.querySelector("#canvas");
let ctx = canv.getContext("2d");

let width = 1200;
let height = 750;

let balls = [];

let deltaTime = 0;
let lastFrame = Date.now();

let mouse = {
    x: 0,
    y: 0,
    down: false,
    lDown: false,
    clickPos: {
        x: 0,
        y: 0
    }, 
    clickPullPos: {
        x: 0,
        y: 0
    }
    
}

class Ball {
    constructor(x, y, r, mass, color) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.mass = mass;
        this.color = color;

        this.dragging = false;
        
        this.maxVel = 3.25 - this.mass / 100;
        this.vx = 0;
        this.vy = 0;
    }
    
    handleWallBounce() {
        if (this.y < this.r) {
            this.y = this.r;
            this.vy = Math.abs(this.vy) * 0.7;
        }
        if (this.y + this.r > height) {
            this.y = height - this.r;
            this.vy = Math.abs(this.vy) * -0.7;
        }
        if (this.x < this.r) {
            this.x = this.r;
            this.vx = Math.abs(this.vx) * 0.7;
        }
        if (this.x + this.r > width) {
            this.x = width - this.r;
            this.vx = Math.abs(this.vx) * -0.7;
        }
    }
    
    update(dt) {
        this.vx *= 0.993;
        this.vy *= 0.997;

        if (!this.dragging) this.vy += (dt * 0.000635) + (dt * this.mass * 0.0000275);

        if (this.vx > this.maxVel) this.vx = this.maxVel;
        if (this.vy > this.maxVel) this.vy = this.maxVel;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        this.handleWallBounce();
    }
    
    draw() {
        ctx.fillStyle = this.color;

        if (this.dragging) ctx.fillStyle = "#fff";

        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.r, this.r, 0, 0, 360);
        ctx.fill();
    }
}

const checkCollision = (a, b) => {
    let dx = a.x - b.x;
    let dy = a.y - b.y;

    let dist = Math.sqrt(dx * dx + dy * dy);

    return dist <= a.r + b.r;
}

const resolveCollision = (a, b) => {
    if (a.dragging || b.dragging) return;

    let dx = a.x - b.x;
    let dy = a.y - b.y;

    let dist = Math.sqrt(dx * dx + dy * dy);

    let displace = (dist - (a.r + b.r)) / 2;

    a.x -= displace * dx / dist;
    a.y -= displace * dy / dist;
    b.x += displace * dx / dist;
    b.y += displace * dy / dist;

    let nx = (b.x - a.x) / dist;
    let ny = (b.y - a.y) / dist;

    let tx = -ny;
    let ty = nx;

    let dpTanA = a.vx * tx + a.vy * ty;
    let dpTanB = b.vx * tx + b.vy * ty;

    let dpNormA = a.vx * nx + a.vy * ny;
    let dpNormB = b.vx * nx + b.vy * ny;

    let ma = (dpNormA * (a.mass - b.mass) + 1.25 * b.mass * dpNormB) / (a.mass + b.mass);
    let mb = (dpNormB * (b.mass - a.mass) + 1.25 * a.mass * dpNormA) / (a.mass + b.mass);

    a.vx = tx * dpTanA + nx * ma;
    a.vy = ty * dpTanA + ny * ma;
    b.vx = tx * dpTanB + nx * mb;
    b.vy = ty * dpTanB + ny * mb;
}

const mousePos = e => {
    let rect = canv.getBoundingClientRect();

    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
}

const checkDrag = (ball, pos) => {
    let dx, dy;

    if (ball.dragging) {
        dx = ball.x - pos.x;
        dy = ball.y - pos.y;
    } else {
        dx = ball.x - pos.clickPos.x;
        dy = ball.y - pos.clickPos.y;
    }

    let dist = Math.hypot(dx, dy);

    return ball.dragging || dist <= ball.r;
}

const checkPull = (ball, pos) => {
    let dx, dy;
    if (ball.pulling) {
        dx = ball.x - pos.x;
        dy = ball.y - pos.y;
    } else {
        dx = ball.x - pos.clickPullPos.x;
        dy = ball.y - pos.clickPullPos.y;
    }

    let dist = Math.sqrt(dx * dx + dy * dy);

    return dist <= ball.r;
}

const handleDrag = (ball, pos) => {
    ball.x = pos.x + ball.deltaDrag.x;
    ball.y = pos.y + ball.deltaDrag.y;

    ball.vx = 0;
    ball.vy = 0;
}

const handlePull = (ball, pos) => { 
    ball.pull = {
        x: pos.x,
        y: pos.y
    }

    ctx.strokeStyle = "#33f";
    ctx.lineWidth = 3;
    
    ctx.setLineDash([7, 7]);
    
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    ctx.setLineDash([]);
}

const handlePullRelease = () => {
    let pulledBall;
    for (const ball of balls) {
        if (ball.pulling) {
          pulledBall = ball;
          
          break;
        }
    }

    if (!pulledBall) return;

    dx = pulledBall.x - mouse.x;
    dy = pulledBall.y - mouse.y;

    pulledBall.vx += (0.035 / pulledBall.mass) * dx * deltaTime;
    pulledBall.vy += (0.035 / pulledBall.mass) * dy * deltaTime;

}

let draggingAnyBall = false;
let pullingAnyBall = false;

const update = () => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    
    deltaTime = Date.now() - lastFrame;
    lastFrame = Date.now();

    for (const ball of balls) {
        ball.update(deltaTime);
        ball.draw();

        if (ball.dragging) handleDrag(ball, mouse);
        else if (ball.pulling) handlePull(ball, mouse);

        for (const ball2 of balls) {
            if (ball == ball2) continue;

            if (checkCollision(ball, ball2)) resolveCollision(ball, ball2);
        }
    }

    requestAnimationFrame(update);
}

update();

window.onmousemove = e => mousePos(e);

window.onmousedown = e => {
    if (e.button == 0) {
        mouse.down = true;
        mouse.clickPos = {
            x: mouse.x, 
            y: mouse.y
        }

        for (const ball of balls) {
          if (!draggingAnyBall && Math.hypot(mouse.x - ball.x, mouse.y - ball.y) < ball.r) {
            ball.dragging = true;
            draggingAnyBall = true;

            ball.deltaDrag = {
              x: ball.x - mouse.x,
              y: ball.y - mouse.y
            }

            handleDrag(ball, mouse);

            break;
          }
        }
    } else {
        mouse.lDown = true;
        mouse.clickPullPos = {
            x: mouse.x, 
            y: mouse.y
        }

        for (const ball of balls) {
          if (!pullingAnyBall && Math.hypot(mouse.x - ball.x, mouse.y - ball.y) < ball.r) {
            ball.pulling = true;
            pullingAnyBall = true;

            handlePull(ball, mouse);

            break;
          }
        }
    }
}

window.onmouseup = e => {
    if (e.button == 0) {
        mouse.down = false;

        for (const ball of balls) {
          ball.dragging = false;
        }
    } else {
        mouse.lDown = false;

        handlePullRelease();

        for (const ball of balls) {
          ball.pulling = false;
        }
    }

    draggingAnyBall = false;
    pullingAnyBall = false;
}

window.onkeydown = e => {
    let size = Math.floor(Math.random() * 50 + 25);
    let mass = size * 0.6;

    if (e.key == " ") {
        balls.push(new Ball(mouse.x, mouse.y, size, mass, `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`));
    }
}

canv.oncontextmenu = () => {
    return false;
}
