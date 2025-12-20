const root = document.documentElement;
const bgColor = getComputedStyle(root).getPropertyValue("--bg-color");

class Vector {
    static ZERO = new Vector(0, 0);
    static BOUND = null;

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
        if (Vector.BOUND === null) console.error("Bound undefined!");
        return Vector.BOUND;
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

    dot(vec) {
        return this.x * vec.x + this.y * vec.y;
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    sign(threshold = Vector.ZERO) {
        return new Vector(
            Math.abs(this.x) < threshold.x ? 0 : this.x < 0 ? -1 : 1,
            Math.abs(this.y) < threshold.y ? 0 : this.y < 0 ? -1 : 1
        );
    }
}

class EnvObjs {
    static defaults = { LIFESPAN: null };

    constructor(pos, lifespan = EnvObjs.defaults.LIFESPAN) {
        this.pos = pos;

        // Despawning purposes
        if (lifespan === null) {
            this.forever = true;
        } else {
            this.despawnTime = new Date().getTime() + lifespan * 1000;
            this.forever = false;
        }
    }

    checkAlive() {
        return this.forever ? true : new Date().getTime() < this.despawnTime;
    }
}

class Scatterer extends EnvObjs {
    static defaults = { EFFECT_RANGE: 120 };

    constructor(
        pos,
        lifespan = EnvObjs.defaults.LIFESPAN,
        range = Scatterer.defaults.EFFECT_RANGE
    ) {
        super(pos, lifespan);

        // For animation
        this.phase = 0;

        // For range
        this.range = range;
    }

    willScatter(boid) {
        return this.pos.dist(boid.pos) < this.range;
    }
}

class Goal extends EnvObjs {
    static defaults = { LURE: 0.0005 };

    constructor(pos, lifespan = EnvObjs.defaults.LIFESPAN) {
        super(pos, lifespan);
    }

    getPrioritisationVal(boid) {
        const diffVec = this.pos.add(boid.pos.scalarMul(-1));
        const distToGoal = diffVec.norm();
        const cosTheta = diffVec.dot(boid.vel) / distToGoal / boid.vel.norm();

        return (cosTheta + 1) * distToGoal;
    }
}

class Obstacle extends EnvObjs {
    static defaults = { SIZE: 40, AVOID_RANGE: 35 };
    static REACTION_DIST =
        Obstacle.defaults.SIZE + Obstacle.defaults.AVOID_RANGE;

    constructor(pos, lifespan = EnvObjs.defaults.LIFESPAN) {
        super(pos, lifespan);
    }

    willAvoid(boid) {
        return boid.pos.dist(this.pos) < Obstacle.REACTION_DIST;
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
    static BOUND_MARGIN = 100;
    static TURN_FACTOR = 1.0;

    constructor(pos, vel) {
        this.pos = pos;
        this.vel = vel;
    }

    static random(
        pos = Vector.bound().mul(Vector.random()),
        vel = Vector.random()
            .add(Vector.scalar(-0.5))
            .mul(Vector.scalar(Boid.MAX_SPEED))
    ) {
        return new Boid(pos, vel);
    }

    adjustWithNeighbours(boids, env) {
        // Adjusting velocity based on Boids rules

        const seen = boids.filter(
            (boid) =>
                boid !== this && this.pos.dist(boid.pos) <= Boid.VISION_RANGE
        );
        const size = seen.length;

        const avoiding = seen.filter(
            (boid) => this.pos.dist(boid.pos) <= Boid.AVOID_RANGE
        );

        if (size === 0) return;

        const c1_mod = env["scatterer"].some((s) => s.willScatter(this))
            ? -1
            : 1;

        const v1 = seen
            .reduce((v, boid) => v.add(boid.pos), Vector.ZERO)
            .scalarMul(1 / size)
            .add(this.pos.scalarMul(-1))
            .scalarMul(Boid.C1 * c1_mod);
        const v2 = avoiding
            .reduce(
                (v, boid) => v.add(this.pos).add(boid.pos.scalarMul(-1)),
                Vector.ZERO
            )
            .scalarMul(Boid.C2);
        const v3 = seen
            .reduce((v, boid) => v.add(boid.vel), Vector.ZERO)
            .scalarMul(1 / size)
            .add(this.vel.scalarMul(-1))
            .scalarMul(Boid.C3);

        this.vel = this.vel.add(v1).add(v2).add(v3);
    }

    adjustToGoal(env) {
        // Adjusting to goal

        if (env["goal"].length === 0) return;

        const goal = env["goal"].reduce(
            (acc, g) => {
                const pVal = g.getPrioritisationVal(this);
                return pVal > acc[0] ? [pVal, g] : acc;
            },
            [0, null]
        )[1];

        const goalNudge = goal.pos
            .add(this.pos.scalarMul(-1))
            .scalarMul(Goal.defaults.LURE);

        this.vel = this.vel.add(goalNudge);
    }

    adjustFromObstacle(env) {
        // Adjusting away from obstacles.

        const relevantObstacles = env["obstacle"].filter((o) =>
            o.willAvoid(this)
        );

        if (relevantObstacles.length === 0) return;

        const obstNudge = relevantObstacles.reduce((v, o) => {
            const diffVec = o.pos.add(this.pos.scalarMul(-1));
            const dotProduct = this.vel.dot(diffVec);

            if (dotProduct < 0) return v;

            const proj_vel_diff = diffVec.scalarMul(
                dotProduct / diffVec.dot(diffVec)
            );
            const shadeVec = this.vel.add(proj_vel_diff.scalarMul(-1));

            return v.add(shadeVec) //.scalarMul(this.vel.norm() / shadeVec.norm()));
        }, Vector.ZERO);
        
        let intermediariesNudge = Vector.ZERO;
        for (const obs1 of relevantObstacles) {
            for (const obs2 of relevantObstacles) {
                if (obs1 ==- obs2) continue;
                const midPoint = obs2.pos.add(obs1.pos).scalarMul(1/2);
                if (obs1.pos.dist(midPoint) > Obstacle.defaults.SIZE) continue
                if (midPoint.dist(this.pos) > Obstacle.defaults.SIZE + 10) continue
                const dir = this.pos.add(midPoint.scalarMul(-1))
                intermediariesNudge = intermediariesNudge.add(dir);
            }
        }

        if (obstNudge !== Vector.ZERO) {
            this.vel = this.vel.add(obstNudge.scalarMul(this.vel.norm() / obstNudge.norm()))
        };

        if (intermediariesNudge !== Vector.ZERO) {
            this.vel = this.vel.add(intermediariesNudge.scalarMul(this.vel.norm() / intermediariesNudge.norm()));
        }
        // this.vel = this.vel.add(obstNudge);
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
                .add(Vector.bound().scalarMul(-1 / 2))
                .sign(
                    Vector.bound()
                        .scalarMul(1 / 2)
                        .add(Vector.scalar(-1 * Boid.BOUND_MARGIN))
                )
                .scalarMul(-1 * Boid.TURN_FACTOR)
        );
    }

    updateVel(boids, env) {
        // Update velocity of boid

        this.adjustWithNeighbours(boids, env);
        this.adjustToGoal(env);
        this.adjustFromObstacle(env);

        if (!Boid.WRAP) this.keepInBounds();
        this.capSpeed();
    }

    move() {
        const newPos = this.pos.add(this.vel);
        this.pos = Boid.WRAP ? newPos.mod(Vector.bound()) : newPos;
    }
}

class Drawer {
    // Drawing Wide
    static SHADOWBLUR = 15;
    static PRIMARY_SHADE =
        getComputedStyle(root).getPropertyValue("--boid-color");
    static SECONDARY_SHADE = `rgb(${Drawer.PRIMARY_SHADE.match(
        /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/
    )
        .slice(1)
        .map((c) => Math.round(parseInt(c) * 0.65))
        .join(", ")})`;

    // For Boid
    static BOID = {
        COLOR: Drawer.PRIMARY_SHADE,
    };

    // For Obstacle
    static OBSTAClE = {
        COLOR: Drawer.SECONDARY_SHADE.replace("rgb", "rgba").replace(
            ")",
            ", 0.4)"
        ),
    };

    // For scatterer
    static SCATTERER = {
        SPEED: 0.01,
        LINEWIDTH: 3,
        COLOR: Drawer.PRIMARY_SHADE.replace("rgb", "rgba").replace(
            ")",
            ", 0.1)"
        ),
    };

    // For goal
    static GOAL = {
        WIDTH: 25,
        HEIGHT: 20,
        LINEWIDTH: 3,
        COLOR: Drawer.SECONDARY_SHADE,
    };

    constructor(ctx) {
        this.ctx = ctx;
    }

    drawBoid(boid) {
        this.ctx.save();

        this.ctx.translate(boid.pos.x, boid.pos.y);
        this.ctx.rotate(boid.vel.angle());

        this.ctx.fillStyle = Drawer.BOID.COLOR;

        // Teardrop
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.bezierCurveTo(-8, 5, -14, 6, -15, 0);
        this.ctx.bezierCurveTo(-14, -6, -8, -5, 0, 0);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    drawObstacle(obstacle) {
        this.ctx.beginPath();
        this.ctx.arc(
            obstacle.pos.x,
            obstacle.pos.y,
            Obstacle.defaults.SIZE,
            0,
            Math.PI * 2
        ); // Full circle
        this.ctx.fillStyle = Drawer.OBSTAClE.COLOR;
        this.ctx.fill();
    }

    drawScatterer(scatterer) {
        scatterer.phase =
            (scatterer.phase + Drawer.SCATTERER.SPEED * Math.PI) %
            (Math.PI / 2);

        const pulse = Math.sin(scatterer.phase);
        const radius = pulse * scatterer.range;
        const alpha = 0.05 + pulse * 0.1;

        this.ctx.save();

        // Circle
        this.ctx.strokeStyle = Drawer.SCATTERER.COLOR.replace(
            "0.1",
            alpha.toString()
        );
        this.ctx.lineWidth = Drawer.SCATTERER.LINEWIDTH;
        this.ctx.beginPath();
        this.ctx.arc(scatterer.pos.x, scatterer.pos.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Light glow effect
        this.ctx.shadowBlur = Drawer.SHADOWBLUR;
        this.ctx.shadowColor = Drawer.SCATTERER.COLOR;
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawGoal(goal) {
        this.ctx.save();
        this.ctx.translate(goal.pos.x, goal.pos.y);

        // Flagpole
        this.ctx.strokeStyle = Drawer.GOAL.COLOR;
        this.ctx.lineWidth = Drawer.GOAL.LINEWIDTH;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, -2 * Drawer.GOAL.HEIGHT); // Short pole
        this.ctx.stroke();

        // Pennant
        this.ctx.fillStyle = Drawer.GOAL.COLOR;
        this.ctx.beginPath();
        this.ctx.moveTo(Drawer.GOAL.LINEWIDTH / 2, -2 * Drawer.GOAL.HEIGHT);
        this.ctx.lineTo(Drawer.GOAL.WIDTH, -1.5 * Drawer.GOAL.HEIGHT);
        this.ctx.lineTo(Drawer.GOAL.LINEWIDTH / 2, -Drawer.GOAL.HEIGHT);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }
}

class Simulator {
    static NUM_BOIDS = 100;
    static INSTANCE = null;

    static MODE_ENUM = {
        VIEW: 0, // View, clicking does nothing
        BOID: 1, // Click to spawn boids
        OBSTACLE: 2, // Click to spawn obstacles
        SCATTERER: 3, // Click to spawn scatterers
        GOAL: 4, // Click to spawn goals
    };
    static SPAWANABLE = ["boid", "obstacle", "scatterer", "goal"];
    static NUM_MODES = Object.keys(Simulator.MODE_ENUM).length;
    static DESPAWN_DIST = 30;

    constructor() {
        if (Simulator.INSTANCE) {
            return Simulator.INSTANCE;
        }

        this.boids = [];
        this.env = {
            obstacle: [],
            scatterer: [],
            goal: [],
        };

        const canvasEl = document.getElementById("canvas");
        canvasEl.width = window.innerWidth;
        canvasEl.height = window.innerHeight;

        this.ctx = canvasEl.getContext("2d");
        this.drawer = new Drawer(this.ctx);

        this.bounds = { width: canvasEl.width, height: canvasEl.height };
        Vector.BOUND = new Vector(canvasEl.width, canvasEl.height);

        Simulator.INSTANCE = this;

        // Toggling modes
        this.mode = Simulator.MODE_ENUM.VIEW;
        this.notifEl = document.getElementById("notification");
        this.notifTimer = setTimeout(() => {
            this.notifEl.style.opacity = 0;
        }, 5000);

        for (let i = 0; i < Simulator.NUM_BOIDS; i++) {
            this.boids.push(Boid.random());
        }

        return Simulator.INSTANCE;
    }

    animationLoop() {
        Object.keys(this.env).forEach(
            (type) =>
                (this.env[type] = this.env[type].filter((obj) =>
                    obj.checkAlive()
                ))
        );

        this.boids.forEach((boid) => {
            boid.updateVel(this.boids, this.env);
            boid.move();
        });
        this.ctx.clearRect(0, 0, this.bounds.width, this.bounds.height);
        this.boids.forEach((boid) => this.drawer.drawBoid(boid));

        this.env["obstacle"].forEach((o) => this.drawer.drawObstacle(o));
        this.env["scatterer"].forEach((s) => this.drawer.drawScatterer(s));
        this.env["goal"].forEach((g) => this.drawer.drawGoal(g));

        window.requestAnimationFrame(this.animationLoop.bind(this));
    }

    run() {
        window.requestAnimationFrame(this.animationLoop.bind(this));
    }

    spawn(x, y) {
        switch (this.mode) {
            case Simulator.MODE_ENUM.VIEW:
                break;
            case Simulator.MODE_ENUM.BOID:
                this.boids.push(Boid.random(new Vector(x, y)));
                break;
            case Simulator.MODE_ENUM.OBSTACLE:
                this.env["obstacle"].push(new Obstacle(new Vector(x, y)));
                break;
            case Simulator.MODE_ENUM.SCATTERER:
                this.env["scatterer"].push(new Scatterer(new Vector(x, y)));
                break;
            case Simulator.MODE_ENUM.GOAL:
                this.env["goal"].push(new Goal(new Vector(x, y)));
                break;
            default:
                console.warn(
                    "this.mode value does not match Spawnable enum. Nothing spawned!"
                );
        }
    }

    despawn(x, y) {
        switch (this.mode) {
            case Simulator.MODE_ENUM.VIEW:
            case Simulator.MODE_ENUM.BOID:
                break;
            case Simulator.MODE_ENUM.OBSTACLE:
            case Simulator.MODE_ENUM.SCATTERER:
            case Simulator.MODE_ENUM.GOAL:
                const envObjType = Simulator.SPAWANABLE[this.mode - 1];
                this.env[envObjType] = this.env[envObjType].filter(
                    (envObj) =>
                        envObj.pos.dist(new Vector(x, y)) >
                        Simulator.DESPAWN_DIST
                );
                break;
            default:
                console.warn(
                    "this.mode value does not match Spawnable enum. Nothing despawned!"
                );
        }
    }

    toggleSpawnOption() {
        this.mode = (this.mode + 1) % Simulator.NUM_MODES;

        clearTimeout(this.notifTimer);

        this.notifEl.innerText =
            this.mode === 0
                ? "View"
                : `Click to add ${Simulator.SPAWANABLE[this.mode - 1]}s`;
        this.notifEl.style.opacity = 1;
        this.notifTimer = setTimeout(() => {
            this.notifEl.style.opacity = 0;
        }, 5000);
    }
}

window.onload = () => {
    const sim = new Simulator();

    window.addEventListener("click", (e) => {
        if (e.ctrlKey) sim.despawn(e.clientX, e.clientY);
        else sim.spawn(e.clientX, e.clientY);
    });
    window.addEventListener("keydown", (e) => {
        if (e.code !== "Space") return;
        e.preventDefault();
        sim.toggleSpawnOption();
    });

    sim.run();
};
