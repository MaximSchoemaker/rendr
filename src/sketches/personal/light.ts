
import { createAnimationFrameParameter, createSketch } from "../../rendr/rendr";
import { angle_diff, clamp, cos, createColor, createHSL, getLayout, inv_cosn, Layout, lerp, lerpColor, map, mod, n_arr, sin, sinn } from "../../rendr/utils";

const GLOBAL_FRAMES = 1501;
const GLOBAL_FPS = 60;

// ... portraid ...
const WIDTH = 1080;
const HEIGHT = 1920;

// ... landscape ...
// const WIDTH = 1920;
// const HEIGHT = 1080;

// ... fit screen ...
// const WIDTH = window.outerWidth;
// const HEIGHT = window.outerHeight;

const PAD = 0.0;
const LAYOUT = getLayout("fit", WIDTH, HEIGHT, PAD);

// ... video ...
const LOOPS = 1;

const INTERSECTION_EXTRA = 0.0001;

// ... variations ...
const POLYGON_SIDES = 3;
const SIMULATION_STEPS = 5;
const LIGHT_CONE_SPREAD = 0.025;
const BEAMS_COUNT = 1;
const COLOR_COUNT = 6;
const RAY_COUNT = 1500;
const REFRACTION_MIN = 1;
const REFRACTION_MAX = 2;
const ALPHA = 5 / 255;
const SATURATION = 0.5;
const HUE_RANGE = 1;

// const POLYGON_SIDES = 6;
// const SIMULATION_STEPS = 6;
// const LIGHT_CONE_SPREAD = 0.05;
// const BEAMS_COUNT = 1;
// const COLOR_COUNT = 6;
// const RAY_COUNT = 1500;
// const REFRACTION_MIN = 1;
// const REFRACTION_MAX = 2;
// const ALPHA = 5 / 255;
// const SATURATION = 0.5;
// const HUE_RANGE = 1;

// const POLYGON_SIDES = 6;
// const SIMULATION_STEPS = 8;
// const LIGHT_CONE_SPREAD = 0.04;
// const BEAMS_COUNT = 1;
// const COLOR_COUNT = 256;
// const RAY_COUNT = 200;
// const REFRACTION_MIN = 1;
// const REFRACTION_MAX = 2;
// const ALPHA = 1 / 256;
// const SATURATION = 0.5;
// const HUE_RANGE = 1;

// const POLYGON_SIDES = 3;
// const SIMULATION_STEPS = 10;
// const LIGHT_CONE_SPREAD = 0.002;
// const BEAMS_COUNT = 2;
// const COLOR_COUNT = 256;
// const RAY_COUNT = 15;
// const REFRACTION_MIN = 1.5;
// const REFRACTION_MAX = 1.7;
// const ALPHA = 1 / 256;
// const SATURATION = 0.66;
// const HUE_RANGE = 0.875;

// const POLYGON_SIDES = 3;
// const SIMULATION_STEPS = 20;
// const LIGHT_CONE_SPREAD = 0.001;
// const BEAMS_COUNT = 3;
// const COLOR_COUNT = 256;
// const RAY_COUNT = 25;
// const REFRACTION_MIN = 1.5;
// const REFRACTION_MAX = 1.7;
// const ALPHA = 1 / 256;
// const SATURATION = 0.66;
// const HUE_RANGE = 0.875;

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

type Circle = {
    x: number;
    y: number;
    r: number;
}

type Beam = {
    x: number;
    y: number;
    angle: number;
    color_f: number;
    inside: boolean;
    previous_intersection: Line | Circle | null;
}

type LightLine = Line & {
    color_f: number;
}

type Shape = {
    type: "reflector" | "refractor" | "absorber";
    lines: Line[];
    // circles?: Circle[];
    onesided: boolean
}

export default createSketch<Props>((engine, ui, props) => {
    const { REALTIME, ANIMATION, VIDEO } = props;

    const FRAMES = GLOBAL_FRAMES;
    const FPS = GLOBAL_FPS;

    const frame_par = createAnimationFrameParameter(FRAMES * LOOPS, FPS);

    if (REALTIME) {
        const canvas = engine.draw(WIDTH, HEIGHT, (ctx) => {
            const index = frame_par.get();
            const t = mod(index / FRAMES);
            scene(ctx, t, LAYOUT);
        })
        ui.mountCanvas(canvas);
    }

    if (ANIMATION) {
        const animation = engine.animate(WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
            const { index } = props;
            const t = mod(index / FRAMES);
            scene(ctx, t, LAYOUT);
        })
        ui.mountCanvasAnimation(animation, frame_par);
    }

    if (VIDEO) {
        const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
            const { index } = props;
            const t = mod(index / FRAMES);
            scene(ctx, t, LAYOUT);
        })
        ui.mountVideo(video);
    }
});

function scene(ctx: CanvasRenderingContext2D, t: number, layout: Layout) {
    const shapes = [
        { lines: getPolygon(0.5, 0.5, POLYGON_SIDES, 0.3, 1 / 12), type: "refractor" as const, onesided: false },
        { lines: getBoundingBox(LAYOUT, 0), type: "reflector" as const, onesided: true }
    ];

    let beams: Beam[] = [];
    for (let i = 0; i < BEAMS_COUNT; i++) {
        const f = i / BEAMS_COUNT;
        const beams_radius = 1;
        const beams_angle = inv_cosn(mod((f + t) * 0.5, 0.5)) + 0.425;
        beams.push(...getLightCone(
            0.5 + cos(beams_angle) * beams_radius,
            0.5 + sin(beams_angle) * beams_radius,
            beams_angle + 0.5,
            LIGHT_CONE_SPREAD,
            false,
            RAY_COUNT,
            COLOR_COUNT,
        ));
    }

    const light_lines: LightLine[] = [];
    for (let i = 0; i < SIMULATION_STEPS; i++)
        beams = stepSimulation(beams, shapes, light_lines);


    ctx.fillStyle = createColor(0);
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";

    ctx.lineWidth = layout.getSize(0.002);
    for (const light_line of light_lines) {
        const { color_f } = light_line
        ctx.strokeStyle = createHSL(color_f * HUE_RANGE, 1, SATURATION, ALPHA)
        // ctx.strokeStyle = createColor(
        //     cos(color_f + 0 / 3 + 0.1),
        //     cos(color_f + 1 / 3),
        //     cos(color_f + 2 / 3),
        //     10 / 255
        // )
        drawLine(ctx, light_line, LAYOUT);
    }

    ctx.globalCompositeOperation = "source-over"
    ctx.lineWidth = layout.getSize(0.005);
    ctx.strokeStyle = createColor(1);
    // drawShape(ctx, shapes[0], layout);

    ctx.strokeStyle = createColor(1);
    // drawShape(ctx, shapes[1], layout);
}

// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
function intersectLineLine(line1: Line, line2: Line) {
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
    if (ua < 0 - INTERSECTION_EXTRA || ua > 1 + INTERSECTION_EXTRA || ub < 0 - INTERSECTION_EXTRA || ub > 1 + INTERSECTION_EXTRA) {
        return false
    }

    // Return a object with the x and y coordinates of the intersection
    let x = x1 + ua * (x2 - x1)
    let y = y1 + ua * (y2 - y1)

    return { x, y }
}

// adapted from line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
function intersectBeamLine(beam: Beam, line: Line) {
    const { x: x3, y: y3, angle } = beam;
    const x4 = x3 + cos(angle) * 1000;
    const y4 = y3 + sin(angle) * 1000;
    const line2 = { x1: x3, y1: y3, x2: x4, y2: y4 };
    return intersectLineLine(line, line2);
}

function getBoundingBox(layout: Layout, border: number) {
    let { width, height, size } = layout;
    width -= size * border;
    height -= size * border;
    const w = width / size
    const h = height / size;
    const x = -(width - size) * 0.5 / size;
    const y = -(height - size) * 0.5 / size
    return [
        { x1: x, y1: y, x2: x, y2: y + h },
        { x1: x, y1: y + h, x2: x + w, y2: y + h },
        { x1: x + w, y1: y + h, x2: x + w, y2: y },
        { x1: x + w, y1: y, x2: x, y2: y },
    ];
}

function getPolygon(cx: number, cy: number, sides: number, radius: number, rotation: number) {
    const lines: Line[] = [];
    const getAngle = (f: number) => rotation - f;
    for (let i = 0; i < sides; i++) {
        const angle1 = getAngle(i / sides);
        const angle2 = getAngle((i + 1) / sides)
        const x1 = cx + cos(angle1) * radius;
        const y1 = cy + sin(angle1) * radius;
        const x2 = cx + cos(angle2) * radius;
        const y2 = cy + sin(angle2) * radius;
        lines.push({ x1, y1, x2, y2 });
    }
    return lines;
}

function getLightCone(cx: number, cy: number, angle: number, spread: number, inside: boolean, count: number, color_count: number) {
    let beams: Beam[] = [];
    for (let i = 0; i < count; i++) {
        const f = count <= 1 ? 0.5 : i / (count - 1);
        const a = angle - spread / 2 + spread * f;

        for (let i = 0; i < color_count; i++) {
            const color_f = i / color_count;
            beams.push({
                x: cx,
                y: cy,
                angle: a,
                inside,
                color_f,
                previous_intersection: null,
            });
        }
    }
    return beams
}

function stepSimulation(beams: Beam[], shapes: Shape[], light_lines: LightLine[]) {
    let new_beams: Beam[] = [];
    for (const beam of beams) {
        let intersections: { x: number; y: number, shape: Shape, line: Line }[] = [];
        for (const shape of shapes) {
            for (const line of shape.lines ?? []) {
                if (line === beam.previous_intersection) continue;
                const inter = intersectBeamLine(beam, line);
                if (inter) intersections.push({ ...inter, shape, line });
            }
            // for (const circle of shape.circles ?? []) {
            //     if (circle === beam.previous_intersection) continue;
            //     const inter = intersectBeamLine(beam, circle);
            //     if (inter) intersections.push({ ...inter, shape, line: circle });
            // }
        }
        if (intersections.length > 0) {
            intersections.sort((a, b) => {
                const da = Math.hypot(a.x - beam.x, a.y - beam.y);
                const db = Math.hypot(b.x - beam.x, b.y - beam.y);
                return da - db;
            });
            const inter = intersections[0];
            light_lines.push({ x1: beam.x, y1: beam.y, x2: inter.x, y2: inter.y, color_f: beam.color_f });

            const { shape, line } = inter;
            const { type, onesided } = shape;

            const normal_angle = mod(Math.atan2(line.y2 - line.y1, line.x2 - line.x1) / (Math.PI * 2) + 0.25);
            const incidence_angle = angle_diff(beam.angle, normal_angle);

            if (onesided && Math.abs(incidence_angle) > 0.25) {
                new_beams.push({
                    ...beam,
                    x: inter.x,
                    y: inter.y,
                    previous_intersection: line,
                });
            } else {
                switch (type) {
                    case "absorber":
                        // do nothing, beam is absorbed
                        break;
                    case "reflector": {
                        // reflect beam
                        let reflect_angle = mod(0.5 + normal_angle - incidence_angle);

                        new_beams.push({
                            ...beam,
                            x: inter.x,
                            y: inter.y,
                            angle: reflect_angle,
                            previous_intersection: line,
                        });
                        break;
                    };
                    case "refractor": {
                        const normal_angle_1 = mod(Math.atan2(line.y2 - line.y1, line.x2 - line.x1) / (Math.PI * 2) + 0.25);
                        const normal_angle_2 = mod(normal_angle_1 + 0.5);
                        const normal_angle = Math.abs(angle_diff(beam.angle, normal_angle_1)) < Math.abs(angle_diff(beam.angle, normal_angle_2)) ? normal_angle_1 : normal_angle_2;

                        const incidence_angle = angle_diff(beam.angle, normal_angle);
                        const refraction = lerp(beam.color_f, REFRACTION_MIN, REFRACTION_MAX);
                        const refraction_index = beam.inside ? refraction : 1.0 / refraction;
                        const refract_angle = (Math.asin(sin(incidence_angle) * refraction_index)) / (Math.PI * 2);

                        const new_angle = isNaN(refract_angle)
                            ? mod(0.5 + normal_angle - incidence_angle) // total internal reflection
                            : mod(normal_angle + refract_angle); // refraction

                        new_beams.push({
                            ...beam,
                            x: inter.x,
                            y: inter.y,
                            angle: new_angle,
                            inside: isNaN(refract_angle) ? beam.inside : !beam.inside,
                            previous_intersection: line,
                        });
                        break;
                    }
                }
            }

        }
    }
    return new_beams;
}

function drawLine(ctx: CanvasRenderingContext2D, line: Line, layout: Layout) {
    ctx.beginPath();
    ctx.moveTo(layout.getX(line.x1), layout.getY(line.y1));
    ctx.lineTo(layout.getX(line.x2), layout.getY(line.y2));
    ctx.stroke();
}


function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, layout: Layout) {
    ctx.beginPath();
    const firstLine = shape.lines[0];
    ctx.moveTo(layout.getX(firstLine.x1), layout.getY(firstLine.y1));
    for (const line of shape.lines)
        ctx.lineTo(layout.getX(line.x2), layout.getY(line.y2));
    ctx.closePath();
    ctx.stroke();
}