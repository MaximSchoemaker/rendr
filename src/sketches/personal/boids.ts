import { l } from "vite/dist/node/types.d-jgA8ss1A";
import { createAnimationFrameParameter, createSketch } from "../../rendr/rendr";
import { angle_diff, clamp, cos, createColor, getLayout, inv_cosn, Layout, lerp, map, mod, n_arr, sin } from "../../rendr/utils";

const GLOBAL_FRAMES = 1000;
const GLOBAL_FPS = 60;

// ... portraid ...
// const WIDTH = 1080;
// const HEIGHT = 1920;
// const LAYOUT = getLayout("fill", WIDTH, HEIGHT);
// const RESET_FRAMES = 75;

// ... landscape ...
// const WIDTH = 1920;
// const HEIGHT = 1080;
// const LAYOUT = getLayout("fit", WIDTH, HEIGHT);
// const RESET_FRAMES = 74;

// ... fit screen ...
const WIDTH = window.outerWidth;
const HEIGHT = window.outerHeight;
const LAYOUT = getLayout("fit", WIDTH, HEIGHT);
const RESET_FRAMES = 74;

// ... video ...
const LOOPS = 6;

// ... params ...
const LAYOUT_BG = getLayout("fill", WIDTH, HEIGHT);

const BOID_VELOCITY = 0.01;
const TURN_SPEED = 0.005;

const COHESION_RADIUS = Infinity;
const COHESION_TURN = TURN_SPEED;

const SEPARATION_RADIUS = 0.02
const SEPARATION_TURN = TURN_SPEED;

const ALIGNMENT_RADIUS = 0.1;
const ALIGNMENT_TURN = TURN_SPEED;

const POS_BUFFER_LENGTH = 20;

// ... types ...
type Boid = {
    x: number;
    y: number;
    angle: number;
    pos_buffer: { x: number; y: number }[];
}

type Props = {
    REALTIME?: boolean;
    ANIMATION?: boolean;
    VIDEO?: boolean;
}

export default createSketch<Props>((engine, ui, props) => {
    const { REALTIME, ANIMATION, VIDEO } = props;

    const FRAMES = GLOBAL_FRAMES;
    const FPS = GLOBAL_FPS;

    const BOIDS_COUNT = 500;

    const getInitalConfig = (f: number) => ({
        x: 0.5,
        y: 0.5,
        angle: f,
        pos_buffer: [],
    });

    const initial_boids: Boid[] = n_arr(BOIDS_COUNT, (_, f) => (getInitalConfig(f)));

    const frame_par = createAnimationFrameParameter(FRAMES * LOOPS, FPS);

    if (REALTIME) {
        const boids_par = engine.update<Boid[]>(initial_boids, (boids) => {
            const frame = frame_par.get();
            updateBoids(boids);
            resetBoids(boids, frame, RESET_FRAMES, FRAMES, getInitalConfig);
        });

        const canvas = engine.draw(WIDTH, HEIGHT, (ctx) => {
            const boids = boids_par.get();
            drawScene(ctx, boids, LAYOUT);
        });

        ui.mountCanvas(canvas);
    }

    if (ANIMATION || VIDEO) {
        const boids_par = engine.simulate<Boid[]>(initial_boids, FRAMES * LOOPS, (boids, props) => {
            const { index } = props;
            const frame = index % FRAMES;
            updateBoids(boids);
            resetBoids(boids, frame, RESET_FRAMES, FRAMES, getInitalConfig);
        });

        if (ANIMATION) {
            const canvas_animation = engine.animate(WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
                const { index } = props;
                const boids = boids_par.get(index);
                drawScene(ctx, boids, LAYOUT);
            });
            ui.mountCanvasAnimation(canvas_animation, frame_par);
        }

        if (VIDEO) {
            const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
                const { index } = props;
                const boids = boids_par.get(index);
                drawScene(ctx, boids, LAYOUT);
            });
            ui.mountVideo(video);
        }
    }
});

function updateBoids(boids: Boid[]) {
    for (const boid of boids) {
        let cohesion_count = 0;
        let cohesion_x = 0;
        let cohesion_y = 0;

        let separation_count = 0;
        let separation_x = 0;
        let separation_y = 0;

        let alignment_count = 0;
        let alignment_angle = 0;

        for (const boid2 of boids) {
            if (boid === boid2) continue;

            const dist = Math.hypot(boid2.x - boid.x, boid2.y - boid.y);
            if (dist < COHESION_RADIUS) {
                cohesion_x += boid2.x;
                cohesion_y += boid2.y;
                cohesion_count++;
            }

            if (dist < SEPARATION_RADIUS) {
                separation_x += boid2.x;
                separation_y += boid2.y;
                separation_count++;
            }

            if (dist < ALIGNMENT_RADIUS) {
                alignment_angle += boid2.angle;
                alignment_count++;
            }
        }

        let angle_add = 0;

        // cohesion
        if (cohesion_count > 0) {
            cohesion_x /= cohesion_count
            cohesion_y /= cohesion_count

            const cohesion_angle = Math.atan2(cohesion_y - boid.y, cohesion_x - boid.x) / (Math.PI * 2);
            const cohesion_angle_dist = angle_diff(cohesion_angle, boid.angle);
            angle_add += clamp(cohesion_angle_dist, -COHESION_TURN, COHESION_TURN);
        }

        // separation
        if (separation_count > 0) {
            separation_x /= separation_count
            separation_y /= separation_count

            const separation_angle = 0.5 + Math.atan2(separation_y - boid.y, separation_x - boid.x) / (Math.PI * 2);
            const separation_angle_dist = angle_diff(separation_angle, boid.angle);
            angle_add += clamp(separation_angle_dist, -SEPARATION_TURN, SEPARATION_TURN);
        }

        // alignment
        if (alignment_count > 0) {
            alignment_angle /= alignment_count;

            const alignment_angle_dist = angle_diff(alignment_angle, boid.angle);
            angle_add += clamp(alignment_angle_dist, -ALIGNMENT_TURN, ALIGNMENT_TURN);
        }

        boid.angle += angle_add;

        // update
        const vel_x = cos(boid.angle) * BOID_VELOCITY
        const vel_y = sin(boid.angle) * BOID_VELOCITY

        boid.x += vel_x
        boid.y += vel_y;

        // boid.x = clamp(boid.x, 0, 1);
        // boid.y = clamp(boid.y, 0, 1);

        // boid.x = mod(boid.x);
        // boid.y = mod(boid.y);

        boid.pos_buffer.push({ x: boid.x, y: boid.y });
        if (boid.pos_buffer.length > POS_BUFFER_LENGTH) boid.pos_buffer.shift();
    };
}

function resetBoids(boids: Boid[], frame: number, reset_frames: number, frames: number, getInitalConfig: (f: number) => Boid) {
    if (frame > frames - reset_frames) {
        const reset_t = (frame - (frames - reset_frames)) / (reset_frames);
        const reset_f = Math.pow(reset_t, 3);
        for (let i = 0; i < boids.length; i++) {
            const boid = boids[i];
            const target = getInitalConfig(i / boids.length);

            boid.x = lerp(reset_f, boid.x, target.x);
            boid.y = lerp(reset_f, boid.y, target.y);
            boid.angle = lerp(reset_f, boid.angle, target.angle);
        }
    }
}

function drawScene(ctx: CanvasRenderingContext2D, boids: Boid[], layout: Layout) {
    const camera_x = boids.reduce((sum, boid) => sum + boid.x, 0) / boids.length - 0.5;
    const camera_y = boids.reduce((sum, boid) => sum + boid.y, 0) / boids.length - 0.5;

    drawGrid(ctx, camera_x, camera_y, LAYOUT_BG);

    const getBgColor = (f: number) => createColor(
        lerp(0.5, cos(f + 0 / 3), 1),
        lerp(0.5, cos(f + 1 / 3), 1),
        lerp(0.5, cos(f + 2 / 3), 1),
        0.1,
    )
    LAYOUT.offset_x = 0.005;
    LAYOUT.offset_y = 0.005;
    ctx.lineWidth = LAYOUT.getSize(0.05);
    drawBoids(ctx, boids, camera_x, camera_y, getBgColor, LAYOUT);

    const getColor = (f: number) => createColor(
        lerp(0.5, cos(f + 0 / 3), 1),
        lerp(0.5, cos(f + 1 / 3), 1),
        lerp(0.5, cos(f + 2 / 3), 1),
    )
    // const getColor = (f: number) => lerpColor(tri(f * 2),
    //     1.0, 0.5, 0.0,
    //     0.5, 0.0, 1.0
    // );
    LAYOUT.offset_x = 0;
    LAYOUT.offset_y = 0;
    ctx.lineWidth = LAYOUT.getSize(0.005);
    drawBoids(ctx, boids, camera_x, camera_y, getColor, LAYOUT);
}

function drawGrid(ctx: CanvasRenderingContext2D, camera_x: number, camera_y: number, layout: Layout) {
    const COUNT = 10;
    const W = 0.0015;
    const H = 0.01;
    const PAD = 0.01;
    for (let i = 0; i <= COUNT; i++) {
        for (let j = 0; j <= COUNT; j++) {
            const x = map(mod(i / COUNT - camera_x), -PAD, 1 + PAD);
            const y = map(mod(j / COUNT - camera_y), -PAD, 1 + PAD);

            ctx.fillStyle = createColor(1);

            ctx.beginPath();
            ctx.rect(layout.getX(x), layout.getY(y - H / 2 + W / 2), layout.getSize(W), layout.getSize(H));
            ctx.fill();

            ctx.beginPath();
            ctx.rect(layout.getX(x - H / 2 + W / 2), layout.getY(y), layout.getSize(H), layout.getSize(W));
            ctx.fill();
        }
    }
}

function drawBoids(
    ctx: CanvasRenderingContext2D,
    boids: Boid[],
    camera_x: number,
    camera_y: number,
    getColor: (f: number) => string,
    layout: Layout
) {
    ctx.strokeStyle = "white";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const boid of boids) {
        const { pos_buffer } = boid;

        ctx.beginPath();
        for (let i = 0; i < pos_buffer.length; i++) {
            const pos = pos_buffer[i];
            const screen_x = layout.getX(pos.x - camera_x);
            const screen_y = layout.getY(pos.y - camera_y);
            if (i === 0) ctx.moveTo(screen_x, screen_y)
            else ctx.lineTo(screen_x, screen_y)
        }

        ctx.strokeStyle = getColor(boid.angle);
        ctx.stroke();
    }
}