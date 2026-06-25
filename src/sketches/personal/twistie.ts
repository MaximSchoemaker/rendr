import { createAnimationLoopParameter, createSketch } from "../../rendr/rendr";
import { cos, createColor, getLayout, inv_cosn, Layout, lerp, lerpColor, map, mod, sin, sinn, tri } from "../../rendr/utils";

const GLOBAL_FRAMES = 600;
const GLOBAL_FPS = 60;

// ... portraid ...
// const WIDTH = 1080;
// const HEIGHT = 1920;

// ... landscape ...
const WIDTH = 1920;
const HEIGHT = 1080;

// ... fit screen ...
// const WIDTH = window.outerWidth;
// const HEIGHT = window.outerHeight;

// ... video ...
const LOOPS = 3;

type Circle = {
    x: number;
    y: number;
    z: number;
    scale: number;
    type: "circle" | "ring";
    radius: number;
}

type Shape = Circle;

type Props = {
    REALTIME?: boolean,
    ANIMATION?: boolean,
    VIDEO?: boolean,
}

export default createSketch<Props>((engine, ui, props) => {
    const { REALTIME, ANIMATION, VIDEO } = props;

    const FPS = 60;
    const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;
    const LAYOUT = getLayout('fill', WIDTH, HEIGHT);

    const shapes_cache = engine.simulate<Shape[]>([], FRAMES, (_, props) => {
        const { index } = props;
        const t = mod(index / FRAMES);
        return simulate(t);
    })

    const frame_par = createAnimationLoopParameter(FRAMES, FPS);

    if (REALTIME) {
        const view = engine.draw(WIDTH, HEIGHT, (ctx, props) => {
            const { width, height } = props;
            const frame = Math.floor(frame_par.get());
            const shapes = shapes_cache.getLatest(frame);
            draw(ctx, width, height, shapes, LAYOUT);
        })
        ui.mountCanvas(view);
    }

    if (ANIMATION) {
        const view_cache = engine.animate(WIDTH, HEIGHT, FRAMES, (ctx, props) => {
            const { width, height, index } = props;
            const shapes = shapes_cache.get(index);
            draw(ctx, width, height, shapes, LAYOUT);
        })
        ui.mountCanvasAnimation(view_cache, frame_par);
    }

    if (VIDEO) {
        const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
            const { width, height, index } = props;
            const shapes = shapes_cache.get(mod(index, FRAMES));
            draw(ctx, width, height, shapes, LAYOUT);
        })
        ui.mountVideo(video);
    }
});

function simulate(t: number) {
    const shapes: Shape[] = [];

    const COUNT = 10;
    for (let i = 0; i < COUNT; i++) {
        const f = mod(i / COUNT + t);
        const scale = Math.pow(f, 3) * 1.4;
        const twists = 5;
        pushRing(shapes, t, twists, scale);
    }

    shapes.sort((a, b) => a.z - b.z);

    return shapes;
}

function pushRing(shapes: Shape[], t: number, twists: number, scale: number) {
    const ring = { x: 0.5, y: 0.5, z: 0, type: "ring" as const, radius: 0.5 * scale, scale };
    shapes.push(ring);

    const COUNT = 50;
    for (let i = 0; i < COUNT; i++) {
        const f = i / COUNT + t;
        pushTwist(shapes, f, t, ring.x, ring.y, ring.radius, twists, scale);
    }
}

function pushTwist(shapes: Shape[], f: number, t: number, ring_x: number, ring_y: number, ring_radius: number, twists: number, scale: number) {
    const r = 0.05 * scale;
    const twist_z = cos(f * twists) * r;
    const twist_r = sin(f * twists) * r;

    const radius = ring_radius + twist_r

    const x = ring_x + cos(f - t) * radius;
    const y = ring_y + sin(f - t) * radius;
    const z = twist_z;

    shapes.push({ x, y, z, type: "circle" as const, radius: 0.04 * scale, scale });
}

function draw(ctx: CanvasRenderingContext2D, width: number, height: number, shapes: Shape[], layout: Layout) {
    const bg = createColor(0.1, 0, 0.3);
    const fg = createColor(0, 0, 0.1);

    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, layout.max_size / 2)
    gradient.addColorStop(0, bg);
    gradient.addColorStop(1, fg);

    ctx.fillStyle = gradient;
    ctx.rect(0, 0, width, height);
    ctx.fill();

    for (const shape of shapes) {
        const { type } = shape;
        switch (type) {
            case "circle":
            case "ring": {
                const { x, y, radius, scale } = shape;

                const line_scale = lerp(scale, 0, 1)

                switch (type) {

                    case "ring":
                        ctx.beginPath();
                        ctx.arc(layout.getX(x), layout.getY(y), layout.getSize(radius), 0, Math.PI * 2);

                        ctx.strokeStyle = bg;
                        const ring_width = 0.025 * scale;
                        ctx.lineWidth = layout.getSize(ring_width);
                        ctx.stroke();

                        ctx.strokeStyle = fg;
                        const ring_outline_width = Math.max(0.000001, ring_width - 0.0075 * line_scale);
                        ctx.lineWidth = layout.getSize(ring_outline_width);
                        ctx.stroke();
                        break;

                    case "circle":
                        ctx.beginPath();
                        ctx.arc(layout.getX(x), layout.getY(y), layout.getSize(radius), 0, Math.PI * 2);

                        ctx.strokeStyle = bg
                        ctx.lineWidth = layout.getSize(0.003 * line_scale);

                        ctx.fillStyle = lerpColor(tri(x + scale),
                            0.5, 0, 1,
                            1, 0.5, 0,
                        );
                        ctx.fill();
                        ctx.stroke();
                        break;
                }
                break
            }
        }
    }
}