
import { createAnimationLoopParameter, createSketch } from "../../rendr/rendr";
import { cos, cosn, createColor, getLayout, inv_cosn, Layout, lerp, lerpColor, map, mod, sin, sinn, tri } from "../../rendr/utils";
// import makeNoise2D from "../../libs/simplex-noise";
import { noise } from "../../libs/p5js-noise";

const GLOBAL_FRAMES = 600;
const GLOBAL_FPS = 60;

// ... square ...
const SCALE = 1;
const WIDTH = 1920 * SCALE;
const HEIGHT = 1920 * SCALE;

// ... portraid ...
// const WIDTH = 1080;
// const HEIGHT = 1920;

// ... landscape ...
// const WIDTH = 1920;
// const HEIGHT = 1080;

// ... fit screen ...
// const WIDTH = window.outerWidth;
// const HEIGHT = window.outerHeight;

// ... video ...
const LOOPS = 3;
const MAX_STEPS = Infinity;

// ... parameters ...
const ROWS = 100;
const COLS = 100;
const RANGE = 0.1;

const COARSE = 100 * Math.random();
const C_COARSE = 10 * Math.random();
const C_STEPS = 3;

const START_X = 0.5;
const START_Y = 0.5;
const STEP = 0.0025;
const VEL_LERP = 0.005;

const P_ALPHA = 0.01;
const P_SIZE = 1 * SCALE;
const COLOR_LERP = 1; //Math.random();

const getRange = () => 1
const getOffset = () => Math.random();
const getShift = () => 1;

// const getRange = () => Math.random() > 0.5 ? 1 : Math.random()
// const getOffset = () => Math.random();
// const getShift = () => Math.random();

const r_offset = getOffset();
const g_offset = getOffset();
const b_offset = getOffset();

const r_range = getRange();
const g_range = getRange();
const b_range = getRange();

const r_shift = getShift();
const g_shift = getShift();
const b_shift = getShift();

type Point = {
    x: number;
    y: number;
    c: number;
    vel_x: number;
    vel_y: number;
    start_x: number;
    start_y: number;
}

type Props = {
    REALTIME?: boolean,
    ANIMATION?: boolean,
    VIDEO?: boolean,
}

export default createSketch<Props>((engine, ui, props) => {
    const { REALTIME, ANIMATION, VIDEO } = props;

    const PAD = 0.125;
    const LAYOUT = getLayout('fill', WIDTH, HEIGHT, PAD);

    function getInitialPoints() {
        const points: Point[] = [];

        for (let i = 0; i < COLS; i++) {
            for (let j = 0; j < ROWS; j++) {
                const x = START_X + (-0.5 + i / COLS) * RANGE;
                const y = START_Y + (-0.5 + (j + (i % 2) * 0.5) / ROWS) * RANGE;
                // const x = START_X + (-0.5 + noise(i, j, 0)) * RANGE;
                // const y = START_Y + (-0.5 + noise(i, j, 1)) * RANGE;

                const c = ((i / COLS) + (j / ROWS)) / 2
                // const c = random()

                points.push({
                    x, y, c,
                    vel_x: 0,
                    vel_y: 0,
                    start_x: x,
                    start_y: y
                })
            }
        }

        return points;
    }

    const points = getInitialPoints();

    const canvas = engine.generate(WIDTH, HEIGHT, MAX_STEPS, (ctx) => {
        for (const p of points) {
            update(p);
            paint(p, ctx, LAYOUT);
        }
    });

    ui.mountCanvas(canvas);
});


// const noise2D = makeNoise2D();
// const noise = (x: number, y: number) => noise2D(x, y) * 0.5 + 0.5;

function value(x: number, y: number, field: number) {
    // const coarse = x < 0.5 ? COARSE : COARSE * 5;

    const f = noise(
        x * C_COARSE + 1,
        y * C_COARSE + 1
    );

    const coarse_f = Math.floor(f * C_STEPS) / C_STEPS;
    const coarse = COARSE * coarse_f;

    // const coarse = COARSE * f;

    field++;
    return noise(
        x * coarse + field,
        y * coarse + field
    ) * 2 - 1;
}


function update(p: Point) {
    // p.x += value(p.x, p.y, 0) * STEP;
    // p.y += value(p.x, p.y, 1) * STEP;

    const new_vel_x = value(p.x, p.y, 1) * STEP;
    const new_vel_y = value(p.x, p.y, 2) * STEP;
    p.vel_x = lerp(VEL_LERP, p.vel_x, new_vel_x);
    p.vel_y = lerp(VEL_LERP, p.vel_y, new_vel_y);
    p.x += p.vel_x;
    p.y += p.vel_y;

    // const a = value(p.x, p.y, 0);
    // const r = value(p.x, p.y, 1);
    // p.x += cosn(a) * r * STEP;
    // p.y += sinn(a) * r * STEP;

    p.x = mod(p.x);
    p.y = mod(p.y);

    // if (p.x <0 || p.y < 0 || p.x > 1 || p.y > 1) {
    //   p.x = p.start_x;
    //   p.y = p.start_y;
    // }

    const a = Math.atan2(p.y - 0.5, p.x - 0.5) / (Math.PI * 2);
    const r = Math.hypot(p.x - 0.5, p.y - 0.5);

    if (r > 0.5) {
        p.x = 0.5 + cos(a + 0.5) * 0.5;
        p.y = 0.5 + sin(a + 0.5) * 0.5;
    }
}

function paint(p: Point, ctx: CanvasRenderingContext2D, layout: Layout) {
    // const r = ncosn(p.c);
    // const g = ncosn(p.c + 0.15);
    // const b = ncosn(p.c + 0.66);

    // const r = ncosn(p.c + r_offst);
    // const g = ncosn(p.c + g_offst);
    // const b = ncosn(p.c + b_offst);

    const a = Math.atan2(p.vel_y, p.vel_x) / Math.PI * 2 + 0.5
    const c_f = lerp(COLOR_LERP, a, p.c)
    const r = cosn(c_f + r_offset) * r_range + r_shift * (1 - r_range);
    const g = cosn(c_f + g_offset) * g_range + g_shift * (1 - g_range);
    const b = cosn(c_f + b_offset) * b_range + b_shift * (1 - b_range);

    const A_COARSE = 10;

    ctx.fillStyle = createColor(r, g, b, P_ALPHA)
    ctx.beginPath();
    ctx.arc(layout.getX(p.x), layout.getY(p.y), P_SIZE, 0, Math.PI * 2);
    ctx.fill();
}
