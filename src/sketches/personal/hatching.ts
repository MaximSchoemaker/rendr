import { createAnimationFrameParameter, createSketch } from "../../rendr/rendr";
import { angle_diff, clamp, cos, createColor, getLayout, inv_cosn, Layout, lerp, lerpColor, map, mod, n_arr, sin, sinn } from "../../rendr/utils";

const GLOBAL_FRAMES = 1500;
const GLOBAL_FPS = 60;

// ... portraid ...
// const WIDTH = 1080;
// const HEIGHT = 1920;

// ... landscape ...
// const WIDTH = 1920;
// const HEIGHT = 1080;

// ... fit screen ...
const WIDTH = window.outerWidth;
const HEIGHT = window.outerHeight;

const PAD = 0;
const LAYOUT = getLayout("fill", WIDTH, HEIGHT, PAD);

// ... video ...
const LOOPS = 6;

type Props = {
    REALTIME?: boolean;
    ANIMATION?: boolean;
    VIDEO?: boolean;
}

type Line = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

const SQUARE: Line[] = [
    { x1: 0, y1: 0, x2: 1, y2: 0 },
    { x1: 1, y1: 0, x2: 1, y2: 1 },
    { x1: 1, y1: 1, x2: 0, y2: 1 },
    { x1: 0, y1: 1, x2: 0, y2: 0 },
]

export default createSketch<Props>((engine, ui, props) => {
    const { REALTIME, ANIMATION, VIDEO } = props;

    const FRAMES = GLOBAL_FRAMES;
    const FPS = GLOBAL_FPS;

    const frame_par = createAnimationFrameParameter(FRAMES * LOOPS, FPS);

    const COL_1 = { r: 0, g: 0, b: 0, a: 0 };
    const COL_2 = { r: 1, g: 0.5, b: 0.2, a: 1 };

    // const COL_1 = { r: 0, g: 0, b: 0, a: 0 };
    // const COL_2 = { r: 0.75, g: 0, b: 0.5, a: 1 };

    const HATCHING_COUNT = 42 * 2;
    const canvas = engine.draw(WIDTH, HEIGHT, (ctx) => {
        const index = frame_par.get();
        const t = mod(index / FRAMES);

        const count_f = Math.pow(inv_cosn(t), 3);
        const SQUARE_COUNT = lerp(count_f, 9, 50);

        ctx.fillStyle = createColor(1, 0, 0.25, 0.05);
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        let squares = [];
        for (let i = 0; i < SQUARE_COUNT; i++) {
            const f = 1 - i / (SQUARE_COUNT - 1);

            const x = lerp(f, 0.5, 0.5);
            const y = lerp(f, 0.5, 0.5);
            const radius = lerp(f, 1, 0.075);
            const angle = lerp(f, 0, 0.125);
            const square = getSquare(x, y, radius, angle);

            const hatching_x = 0.5;
            const hatching_y = 0.5;
            const hatching_angle = 1 / 8 + t;
            const hatching_radius = 1;
            const hatching_offset = 0.5 * i / HATCHING_COUNT + t;
            const hatching = getHatching(hatching_x, hatching_y, hatching_radius, hatching_angle, HATCHING_COUNT, hatching_offset)

            const lines = getShapeHatchingIntersection(square, hatching);

            squares.push({ square: lines, f });
            // for (const line of square) drawLine(ctx, line, LAYOUT);
        }

        for (let i = 0; i < squares.length; i++) {
            const { square, f } = squares[squares.length - 1 - i];
            const color_f = Math.pow(f, 1);
            ctx.strokeStyle = createColor(
                lerp(Math.pow(color_f, 1), COL_1.r, COL_2.r),
                lerp(Math.pow(color_f, 3), COL_1.g, COL_2.g),
                lerp(Math.pow(color_f, 4), COL_1.b, COL_2.b),

                // lerp(Math.pow(color_f, 3), COL_1.r, COL_2.r),
                // lerp(Math.pow(color_f, 4), COL_1.g, COL_2.g),
                // lerp(Math.pow(color_f, 1), COL_1.b, COL_2.b),

                lerp(color_f, COL_1.a, COL_2.a),
            );
            for (const line of square) drawLine(ctx, line, LAYOUT);
        }
    });

    ui.mountCanvas(canvas);
});

// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
function intersect(line1: Line, line2: Line) {
    const { x1, y1, x2, y2 } = line1;
    const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2;

    // Check if none of the lines are of length 0
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
        return false
    }

    const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))

    // Lines are parallel
    if (denominator === 0) {
        return false
    }

    let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
    let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

    // is the intersection along the segments
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
        return false
    }

    // Return a object with the x and y coordinates of the intersection
    let x = x1 + ua * (x2 - x1)
    let y = y1 + ua * (y2 - y1)

    return { x, y }
}

function getSquare(cx: number, cy: number, radius: number, rotation: number) {
    const lines: Line[] = [];
    const getAngle = (f: number) => rotation - 1 / 8 + f;
    for (let i = 0; i < 4; i++) {
        const angle1 = getAngle(i / 4);
        const angle2 = getAngle((i + 1) / 4)
        const x1 = cx + cos(angle1) * radius;
        const y1 = cy + sin(angle1) * radius;
        const x2 = cx + cos(angle2) * radius;
        const y2 = cy + sin(angle2) * radius;
        lines.push({ x1, y1, x2, y2 });
    }
    return lines;
}

function getHatching(cx: number, cy: number, radius: number, rotation: number, count: number, offset: number) {
    const getAngle = (f: number) => rotation + f;
    const angle1 = getAngle(0);
    const angle2 = getAngle(1 / 2);
    const x1 = cx + cos(angle1) * radius;
    const y1 = cy + sin(angle1) * radius;
    const x2 = cx + cos(angle2) * radius;
    const y2 = cy + sin(angle2) * radius;

    const lines: Line[] = [];
    for (let i = 0; i < count; i++) {
        const f = mod(i / count + offset);
        const mid_x = lerp(f, x1, x2);
        const mid_y = lerp(f, y1, y2);
        const line_x1 = mid_x + cos(rotation + 1 / 4) * radius;
        const line_y1 = mid_y + sin(rotation + 1 / 4) * radius;
        const line_x2 = mid_x + cos(rotation - 1 / 4) * radius;
        const line_y2 = mid_y + sin(rotation - 1 / 4) * radius;
        lines.push({ x1: line_x1, y1: line_y1, x2: line_x2, y2: line_y2 });
    }

    return lines;
}

function getShapeHatchingIntersection(shape: Line[], hatching: Line[]) {
    let lines = []
    for (const line of hatching) {
        const intersections = [];
        for (const other of shape) {
            const intersection = intersect(line, other);
            if (intersection) intersections.push(intersection);
        }
        const unique_intersections: { x: number, y: number }[] = [];
        for (const inter of intersections)
            if (!unique_intersections.find(u => Math.hypot(u.x - inter.x, u.y - inter.y) < 0.001))
                unique_intersections.push(inter);

        if (unique_intersections.length !== 2) continue;

        const intersectionLine = {
            x1: unique_intersections[0].x,
            y1: unique_intersections[0].y,
            x2: unique_intersections[1].x,
            y2: unique_intersections[1].y
        };
        lines.push(intersectionLine);
    }

    return lines;
}

function drawLine(ctx: CanvasRenderingContext2D, line: Line, layout: Layout) {
    ctx.beginPath();
    ctx.moveTo(layout.getX(line.x1), layout.getY(line.y1));
    ctx.lineTo(layout.getX(line.x2), layout.getY(line.y2));
    ctx.lineWidth = layout.getSize(0.01);
    // ctx.lineCap = "round";
    ctx.stroke();
}