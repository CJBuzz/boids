const root = document.documentElement;
const bgColor = getComputedStyle(root).getPropertyValue('--bg-color');
const boidColor = getComputedStyle(root).getPropertyValue('--boid-color');

const getWindowDims = () => {
    return [window.innerWidth, window.innerHeight];
}

const resizeCanvas = () => {
    const canvas = document.getElementById("canvas");
    [canvas.width, canvas.height] = getWindowDims();
    Simulator.width = canvas.width;
    Simulator.height = canvas.height;
}

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(vec) {
        return new Vector(this.x + vec.x, this.y + vec.y);
    }

    mod(xBound, yBound) {
        return new Vector((this.x + xBound) % xBound, (this.y + yBound) % yBound);
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }
}

class Boid {
    static SPEED_LIMIT = 5;

    constructor(pos, vel) {
        this.pos = pos;
        this.vel = vel;
    }

    static random(width, height) {
        const pos = new Vector(
            Math.random() * width,
            Math.random() * height
        );
        const vel = new Vector(
            (Math.random() - 0.5) * Boid.SPEED_LIMIT*2,
            (Math.random() - 0.5) * Boid.SPEED_LIMIT*2
        );
        return new Boid(pos, vel);
    }

    move(width, height) {
        this.pos = this.pos.add(this.vel).mod(width, height);
    }
}

const draw = (ctx, boid) => {
    ctx.save();

    ctx.translate(boid.pos.x, boid.pos.y)
    ctx.rotate(boid.vel.angle());
    
    ctx.fillStyle = boidColor;
    
    // Teardrop
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-8, 5, -14, 6, -15, 0);
    ctx.bezierCurveTo(-14, -6, -8, -5, 0, 0);
    ctx.closePath();
    ctx.fill()
    
    // Triangle
    // ctx.fill(new Path2D('M0,0 L-15,5 L-15,-5 Z'));

    ctx.restore();
}

class Simulator {
    static NUM_BOIDS = 5;
    static INSTANCE = null;
    static width = window.innerWidth;
    static height = window.innerHeight;

    constructor() {
        if (Simulator.INSTANCE) {
            return Simulator.INSTANCE;
        }

        this.boids = [];
        this.ctx = document.getElementById("canvas").getContext("2d");
        Simulator.INSTANCE = this;

        for (let i = 0; i < Simulator.NUM_BOIDS; i++) {
            this.boids.push(Boid.random(Simulator.width, Simulator.height))
        }
        
        return Simulator.INSTANCE;
    } 

    animationLoop() {
        this.ctx.clearRect(0, 0, Simulator.width, Simulator.height);
        for (let boid of this.boids) {
            boid.move(Simulator.width, Simulator.height);
            // console.log(boid.pos.x, boid.pos.y, boid.vel.angle())
            draw(this.ctx, boid);
        }

        window.requestAnimationFrame(this.animationLoop.bind(this));
    }

    run() {
        window.requestAnimationFrame(this.animationLoop.bind(this));
    }
}
const boid = {x: 40, y: 50};

window.onload = () => {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    new Simulator().run();
}
