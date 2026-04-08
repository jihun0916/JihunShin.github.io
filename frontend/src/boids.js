// boids.js — Boids flocking algorithm with fish silhouette rendering

const BOID_COUNT = 18;
const MAX_SPEED = 1.8;
const MAX_FORCE = 0.04;
const PERCEPTION_RADIUS = 80;
const SEPARATION_RADIUS = 35;
const EDGE_MARGIN = 60;
const EDGE_TURN_FORCE = 0.15;
const MOUSE_RADIUS = 120;
const MOUSE_FLEE_FORCE = 0.08;

let canvas, ctx;
let boids = [];
let mouse = { x: -1000, y: -1000 };
let isDark = false;
let animId = null;

class Boid {
    constructor(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * (MAX_SPEED * 0.5 + Math.random() * MAX_SPEED * 0.5);
        this.vy = Math.sin(angle) * (MAX_SPEED * 0.5 + Math.random() * MAX_SPEED * 0.5);
        this.size = 6 + Math.random() * 5;
    }

    update(boids, w, h) {
        const sep = this.separation(boids);
        const ali = this.alignment(boids);
        const coh = this.cohesion(boids);
        const edge = this.edgeSteer(w, h);
        const flee = this.mouseFlee();

        this.vx += sep.x * 1.5 + ali.x * 1.0 + coh.x * 1.0 + edge.x + flee.x;
        this.vy += sep.y * 1.5 + ali.y * 1.0 + coh.y * 1.0 + edge.y + flee.y;

        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > MAX_SPEED) {
            this.vx = (this.vx / speed) * MAX_SPEED;
            this.vy = (this.vy / speed) * MAX_SPEED;
        }

        this.x += this.vx;
        this.y += this.vy;
    }

    separation(boids) {
        let sx = 0, sy = 0, count = 0;
        for (const other of boids) {
            if (other === this) continue;
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < SEPARATION_RADIUS && d > 0) {
                sx += dx / d;
                sy += dy / d;
                count++;
            }
        }
        if (count > 0) {
            sx /= count; sy /= count;
            return this.limit(sx, sy, MAX_FORCE);
        }
        return { x: 0, y: 0 };
    }

    alignment(boids) {
        let ax = 0, ay = 0, count = 0;
        for (const other of boids) {
            if (other === this) continue;
            const d = Math.hypot(this.x - other.x, this.y - other.y);
            if (d < PERCEPTION_RADIUS) {
                ax += other.vx;
                ay += other.vy;
                count++;
            }
        }
        if (count > 0) {
            ax /= count; ay /= count;
            return this.steerTowards(ax, ay);
        }
        return { x: 0, y: 0 };
    }

    cohesion(boids) {
        let cx = 0, cy = 0, count = 0;
        for (const other of boids) {
            if (other === this) continue;
            const d = Math.hypot(this.x - other.x, this.y - other.y);
            if (d < PERCEPTION_RADIUS) {
                cx += other.x;
                cy += other.y;
                count++;
            }
        }
        if (count > 0) {
            cx = cx / count - this.x;
            cy = cy / count - this.y;
            return this.steerTowards(cx, cy);
        }
        return { x: 0, y: 0 };
    }

    edgeSteer(w, h) {
        let sx = 0, sy = 0;
        if (this.x < EDGE_MARGIN) sx = EDGE_TURN_FORCE;
        if (this.x > w - EDGE_MARGIN) sx = -EDGE_TURN_FORCE;
        if (this.y < EDGE_MARGIN) sy = EDGE_TURN_FORCE;
        if (this.y > h - EDGE_MARGIN) sy = -EDGE_TURN_FORCE;
        return { x: sx, y: sy };
    }

    mouseFlee() {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_RADIUS && d > 0) {
            return {
                x: (dx / d) * MOUSE_FLEE_FORCE * (1 - d / MOUSE_RADIUS),
                y: (dy / d) * MOUSE_FLEE_FORCE * (1 - d / MOUSE_RADIUS)
            };
        }
        return { x: 0, y: 0 };
    }

    steerTowards(tx, ty) {
        const mag = Math.sqrt(tx * tx + ty * ty);
        if (mag === 0) return { x: 0, y: 0 };
        const dx = (tx / mag) * MAX_SPEED - this.vx;
        const dy = (ty / mag) * MAX_SPEED - this.vy;
        return this.limit(dx, dy, MAX_FORCE);
    }

    limit(x, y, max) {
        const mag = Math.sqrt(x * x + y * y);
        if (mag > max) {
            return { x: (x / mag) * max, y: (y / mag) * max };
        }
        return { x, y };
    }

    draw(ctx) {
        const angle = Math.atan2(this.vy, this.vx);
        const s = this.size;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Fish body (teardrop shape)
        ctx.beginPath();
        ctx.moveTo(s * 1.1, 0);                  // nose
        ctx.quadraticCurveTo(s * 0.3, -s * 0.45, -s * 0.5, -s * 0.15);
        ctx.lineTo(-s * 0.5, s * 0.15);
        ctx.quadraticCurveTo(s * 0.3, s * 0.45, s * 1.1, 0);
        ctx.closePath();

        if (isDark) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.055)';
        }
        ctx.fill();

        // Tail fin
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, 0);
        ctx.lineTo(-s * 0.95, -s * 0.3);
        ctx.quadraticCurveTo(-s * 0.6, 0, -s * 0.95, s * 0.3);
        ctx.closePath();

        if (isDark) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        }
        ctx.fill();

        ctx.restore();
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const boid of boids) {
        boid.update(boids, canvas.width, canvas.height);
        boid.draw(ctx);
    }

    animId = requestAnimationFrame(animate);
}

export function initBoids() {
    canvas = document.createElement('canvas');
    canvas.id = 'boids-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
    document.body.prepend(canvas);
    ctx = canvas.getContext('2d');

    isDark = document.documentElement.dataset.theme === 'dark';

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
        mouse.x = -1000;
        mouse.y = -1000;
    });

    for (let i = 0; i < BOID_COUNT; i++) {
        boids.push(new Boid(canvas.width, canvas.height));
    }

    animate();
}

export function setBoidsTheme(dark) {
    isDark = dark;
}
