/** Brand yellow first, then a few friends, so the burst reads as the app's. */
const COLORS = ['#f5c518', '#ffd966', '#ff6b6b', '#4ecdc4', '#5b8def', '#ff9f43'];
const COUNT = 160;
const DURATION_MS = 2800;

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    spin: number;
}

/**
 * A short burst of confetti over the whole screen, for a new number one.
 * Hand-rolled on a canvas that removes itself, so no dependency and no
 * state: call it and forget it. Skipped for people who asked for less motion.
 */
export function launchConfetti(): void {
    if (typeof document === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context === null) return;
    const scale = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100';
    context.scale(scale, scale);
    document.body.append(canvas);

    const particles: Particle[] = Array.from({ length: COUNT }, (_, index) => {
        const fromLeft = index % 2 === 0;
        const angle = (fromLeft ? -60 : -120) + (Math.random() - 0.5) * 50;
        const speed = 9 + Math.random() * 7;
        return {
            x: fromLeft ? 0 : width,
            y: height * 0.8,
            vx: Math.cos((angle * Math.PI) / 180) * speed,
            vy: Math.sin((angle * Math.PI) / 180) * speed,
            size: 6 + Math.random() * 6,
            color: COLORS[index % COLORS.length] ?? '#f5c518',
            rotation: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.3,
        };
    });

    const started = performance.now();
    const frame = (now: number) => {
        const elapsed = now - started;
        context.clearRect(0, 0, width, height);
        const fade = elapsed > DURATION_MS - 600 ? (DURATION_MS - elapsed) / 600 : 1;
        for (const particle of particles) {
            particle.vy += 0.25;
            particle.vx *= 0.99;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.spin;
            context.save();
            context.globalAlpha = Math.max(0, fade);
            context.translate(particle.x, particle.y);
            context.rotate(particle.rotation);
            context.fillStyle = particle.color;
            context.fillRect(
                -particle.size / 2,
                -particle.size / 4,
                particle.size,
                particle.size / 2,
            );
            context.restore();
        }
        if (elapsed < DURATION_MS) {
            requestAnimationFrame(frame);
        } else {
            canvas.remove();
        }
    };
    requestAnimationFrame(frame);
}
