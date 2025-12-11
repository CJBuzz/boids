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

    mul(vec) {
        return new Vector(this.x * vec.x, this.y * vec.y);
    }

    scalarMul(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    } 

    mod(vec) {
        return new Vector(
            ((this.x % vec.x) + vec.x) % vec.x, 
            ((this.y % vec.y) + vec.y) % vec.y
        );
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
    
    sign(threshold = Vector.ZERO) {
        return new Vector(
            Math.abs(this.x) < threshold.x ? 0 : this.x < 0 ? -1 : 1,
            Math.abs(this.y) < threshold.y ? 0 : this.y < 0 ? -1 : 1
        )
    }
}

class Scatterer {
    static EFFECT_RANGE = 120;

    // For animation
    static ANIMATION_SPEED = 0.01;
    static LINEWIDTH = 3;
    static COLOR = boidColor.replace('rgb', 'rgba').replace(')', ', 0.1)');

    constructor(pos) {
        this.pos = pos;
        
        // For animation
        this.phase = 0;
    }

    willScatter(boid) {
        return this.pos.dist(boid.pos) < Scatterer.EFFECT_RANGE;
    }

    draw(ctx) {
        this.phase = (this.phase + Scatterer.ANIMATION_SPEED * Math.PI) % (Math.PI / 2);

        // Calculate radius based on sine wave for smooth pulse
        const pulseValue = (Math.sin(this.phase));
        const radius = pulseValue * (Scatterer.EFFECT_RANGE);
        
        // Calculate alpha based on pulse (more opaque at max radius)
        const alpha = 0.05 + pulseValue * 0.1;
        
        ctx.save();
        
        // Circle
        ctx.strokeStyle = Scatterer.COLOR.replace('0.1', alpha.toString());
        ctx.lineWidth = Scatterer.LINEWIDTH;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Light glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = Scatterer.COLOR;
        ctx.stroke();
        
        ctx.restore();
    }
}

class Boid {
    static MAX_SPEED = 10;
    // static MIN_SPEED = 0;
    static VISION_RANGE = 75;
    static AVOID_RANGE = 20;
    static C1 = 0.005; // factor to move towards centre of mass of neighbouring boids
    static C2 = 0.05; // factor for collision avoidance
    static C3 = 0.05; // factor for matching velocity

    static WRAP = false;
    static BOUND_MARGIN = 200;
    static TURN_FACTOR = 1.0;
    
    static INIT_SPEED = 10;

    constructor(pos, vel) {
        this.pos = pos;
        this.vel = vel;
    }

    static random() {
        const pos = Vector.bound().mul(Vector.random());
        const vel = Vector.random().add(Vector.scalar(-0.5)).mul(Vector.scalar(Boid.INIT_SPEED));
        return new Boid(pos, vel);
    }

    adjustWithNeighbours(boids, scatterers) {
        // Adjusting velocity based on Boids rules

        const seen = boids.filter(boid => boid !== this && this.pos.dist(boid.pos) <= Boid.VISION_RANGE);
        const size = seen.length

        const avoiding = seen.filter(boid => this.pos.dist(boid.pos) <= Boid.AVOID_RANGE);

        if (size === 0) return;


        const c1_mod = scatterers.some(s => s.willScatter(this)) ? -1 : 1;
        
        const v1 = seen
            .reduce((v, boid) => v.add(boid.pos), Vector.ZERO)
            .scalarMul(1 / size)
            .add(this.pos.scalarMul(-1))
            .scalarMul(Boid.C1 * c1_mod);
        const v2 = avoiding
            .reduce((v, boid) => v.add(this.pos).add(boid.pos.scalarMul(-1)), Vector.ZERO)
            .scalarMul(Boid.C2);
        const v3 = seen
            .reduce((v, boid) => v.add(boid.vel), Vector.ZERO)
            .scalarMul(1 / size)
            .add(this.vel.scalarMul(-1))
            .scalarMul(Boid.C3);
        
        this.vel = this.vel.add(v1).add(v2).add(v3);

    }

    capSpeed() {
        // Limit speed to MAX_SPEED

        const speed = this.vel.norm();
        if (speed > Boid.MAX_SPEED) {
            this.vel = this.vel.scalarMul(Boid.MAX_SPEED / speed);
        } 
    }

    keepInBounds() {
        // Adjust velocity to keep boid within bounds

        this.vel = this.vel.add(
            this.pos
                .add(Vector.bound().scalarMul(-1/2))
                .sign(Vector.bound().scalarMul(1/2).add(Vector.scalar(-1 * Boid.BOUND_MARGIN)))
                .scalarMul(-1 * Boid.TURN_FACTOR)
        )  
    }

    updateVel(boids, env) {
        // Update velocity of boid 

        this.adjustWithNeighbours(boids, env["scatterer"]);
        
        if (!Boid.WRAP) this.keepInBounds();
        this.capSpeed();
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
    static NUM_BOIDS = 100;
    static INSTANCE = null;

    constructor() {
        if (Simulator.INSTANCE) {
            return Simulator.INSTANCE;
        }

        this.boids = [];
        this.env = {
            "scatterer": [new Scatterer(new Vector(window.innerWidth / 2, window.innerHeight / 2))]
        };

        this.ctx = document.getElementById("canvas").getContext("2d");
        Simulator.INSTANCE = this;

        for (let i = 0; i < Simulator.NUM_BOIDS; i++) {
            this.boids.push(Boid.random())
        }
        
        return Simulator.INSTANCE;
    } 

    animationLoop() {
        this.boids.forEach(boid => {
            boid.updateVel(this.boids, this.env);
            boid.move();
        });
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.boids.forEach(boid => draw(this.ctx, boid));

        this.env["scatterer"].forEach(s => s.draw(this.ctx));

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
