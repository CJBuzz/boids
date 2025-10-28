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
    static ZERO = new Vector(0, 0);

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static random() {
        return new Vector(Math.random(), Math.random());
    }

    static scalar(scalar) {
        return new Vector(scalar, scalar);
    }

    static bound() {
        return new Vector(window.innerWidth, window.innerHeight);
    }

    add(vec) {
        return new Vector(this.x + vec.x, this.y + vec.y);
    }

    elMul(vec) {
        return new Vector(this.x * vec.x, this.y * vec.y);
    }

    mul(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    } 

    elMod(vec) {
        return new Vector((this.x + vec.x) % vec.x, (this.y + vec.y) % vec.y);
    }

    norm() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
    
    dist(vec) {
        return Math.sqrt((this.x - vec.x) ** 2 + (this.y - vec.y) ** 2);
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }
    
    elSign(threshold = Vector.ZERO) {
        return new Vector(
            Math.abs(this.x) < threshold.x ? 0 : this.x < 0 ? -1 : 1,
            Math.abs(this.y) < threshold.y ? 0 : this.y < 0 ? -1 : 1
        )
    }
}

class Boid {
    static MAX_SPEED = 10;
    static MIN_SPEED = 5;
    static VISION_RANGE = 100;
    static AVOID_RANGE = 20;
    static C1 = 0.001; // factor to move towards centre of mass of neighbouring boids
    static C2 = 0.01; // factor for collision avoidance
    static C3 = 0.02; // factor for matching velocity

    static WRAP = false;
    static BOUND_MARGIN = 200;
    static TURN_FACTOR = 0.7;

    constructor(pos, vel) {
        this.pos = pos;
        this.vel = vel;
    }

    static random() {
        const pos = Vector.bound().elMul(Vector.random());
        const vel = Vector.random().add(Vector.scalar(-0.5)).elMul(Vector.scalar(Boid.MAX_SPEED * 2));
        return new Boid(pos, vel);
    }

    updateVel(boids) {
        const seen = boids.filter(boid => boid !== this && this.pos.dist(boid.pos) <= Boid.VISION_RANGE);
        const size = seen.length

        const avoiding = seen.filter(boid => this.pos.dist(boid.pos) <= Boid.AVOID_RANGE);

        if (size === 0) return;
        
        const v1 = seen
            .reduce((v, boid) => v.add(boid.pos), Vector.ZERO)
            .mul(1 / size)
            .add(this.pos.mul(-1))
            .mul(Boid.C1);
        const v2 = avoiding
            .reduce((v, boid) => v.add(this.pos).add(boid.pos.mul(-1)), Vector.ZERO)
            .mul(Boid.C2);
        const v3 = seen
            .reduce((v, boid) => v.add(boid.vel), Vector.ZERO)
            .mul(1 / size)
            .add(this.vel.mul(-1))
            .mul(Boid.C3);
        
        this.vel = this.vel.add(v1).add(v2).add(v3);

        const speed = this.vel.norm();
        if (speed > Boid.MAX_SPEED) {
            this.vel = this.vel.mul(Boid.MAX_SPEED / speed);
        } else if (speed < Boid.MIN_SPEED) {
            this.vel = this.vel.mul(Boid.MIN_SPEED / speed);
        }

        if (Boid.WRAP) return;

        this.vel = this.vel.add(
            // this.pos
            //     .add(new Vector(window.innerWidth / -2, window.innerHeight / -2))
            //     .sign(new Vector(
            //         window.innerWidth / 2 - Boid.BOUND_MARGIN,
            //         window.innerHeight / 2 - Boid.BOUND_MARGIN,
            //     ))
            //     .mul(-1 * Boid.TURN_FACTOR)
            this.pos
                .add(Vector.bound().mul(-1/2))
                .elSign(Vector.bound().mul(1/2).add(Vector.scalar(-1 * Boid.BOUND_MARGIN)))
                .mul(-1 * Boid.TURN_FACTOR)
        )       
    }

    move() {
        const newPos = this.pos.add(this.vel) 
        this.pos = Boid.WRAP ? newPos.mod(Vector.bound()) : newPos;
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
    static NUM_BOIDS = 50;
    static INSTANCE = null;

    constructor() {
        if (Simulator.INSTANCE) {
            return Simulator.INSTANCE;
        }

        this.boids = [];
        this.ctx = document.getElementById("canvas").getContext("2d");
        Simulator.INSTANCE = this;

        for (let i = 0; i < Simulator.NUM_BOIDS; i++) {
            this.boids.push(Boid.random())
        }
        
        return Simulator.INSTANCE;
    } 

    animationLoop() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.boids.forEach(boid => boid.updateVel(this.boids));
        for (let boid of this.boids) {
            boid.move();
            draw(this.ctx, boid);
        }

        window.requestAnimationFrame(this.animationLoop.bind(this));
    }

    run() {
        window.requestAnimationFrame(this.animationLoop.bind(this));
    }
}

window.onload = () => {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    new Simulator().run();
}
