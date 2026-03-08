
import { createAnimationFrameParameter, createSketch } from "../../rendr/rendr";
import { angle_diff, clamp, cos, createColor, createHSL, getLayout, inv_cosn, keyState, Layout, lerp, lerpColor, map, mod, n_arr, sin, sinn } from "../../rendr/utils";

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

const PAD = 0.1;
const LAYOUT = getLayout("fit", WIDTH, HEIGHT, PAD, 2, 2);

// ... video ...
const LOOPS = 6;

const INTERSECTION_EXTRA = 0.01;

const GRAVITY = 0.001;
const PLAYER_SPEED = 0.002;
const ROTATE_SPEED = 0.02;
const JUMP_SPEED = 0.02;
const PLAYER_AIR_SPEED = PLAYER_SPEED * 0

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

type Shape = {
    lines: Line[];
}

type Player = Circle & {
    vel_x: number;
    vel_y: number;
    normal_x: number;
    normal_y: number;
}

export default createSketch<Props>((engine, ui, props) => {
    const { REALTIME, ANIMATION, VIDEO } = props;

    const FRAMES = GLOBAL_FRAMES;
    const FPS = GLOBAL_FPS;

    const frame_par = createAnimationFrameParameter(FRAMES * LOOPS, FPS);

    const POLYGON_COUNT = 50;

    const initial_state: {
        player: Player
        world: Shape
        collisions: {
            intersection: { x: number, y: number },
            shape: Line
        }[],
        push_out_collisions: {
            intersection: { x: number, y: number },
            shape: Line
        }[],
        stick_collisions: {
            intersection: { x: number, y: number },
            shape: Line
        }[],
        avg_push_out_collision?: { x: number, y: number, normal_x: number, normal_y: number },
    } = {
        player: { x: 1.5, y: 1, r: 0.05, vel_x: 0, vel_y: 0, normal_x: 0, normal_y: -1 },
        world: {
            lines: [
                // { x1: 0, y1: 0, x2: 0, y2: 1 },
                // { x1: 0, y1: 1, x2: 1, y2: 1 },
                // { x1: 1, y1: 1, x2: 1, y2: 0 },
                // { x1: 1, y1: 0, x2: 0, y2: 0 },
                ...getPolygon(0, 0.5, POLYGON_COUNT, 0.25, 0.5, 0.5),
                ...getPolygon(-0.1, 0.5, POLYGON_COUNT, 0.5, 0.75, 0.75),
                { x1: 0.4, y1: 0.5, x2: 0.4, y2: 0.2 },
                ...getPolygon(.5, 0.2, POLYGON_COUNT, 0.1, 0, 0.5),
                { x1: 0.6, y1: 0.2, x2: 0.6, y2: 0.5 },
                ...getPolygon(1.6, 0.5, POLYGON_COUNT, 1, 0.5, 0.75),
            ],
        },
        collisions: [],
        push_out_collisions: [],
        stick_collisions: [],
    }

    const right_pressed = keyState("ArrowRight");
    const left_pressed = keyState("ArrowLeft");
    const up_pressed = keyState("ArrowUp");
    const down_pressed = keyState("ArrowDown");

    const state_par = engine.update(initial_state, (state) => {
        const frame = frame_par.get();
        const t = mod(frame / FRAMES);

        let { player, world, collisions, push_out_collisions, avg_push_out_collision, stick_collisions } = state;

        stick_collisions.length = 0;
        const below_factor = 0.5;
        const radius_factor = 0.6;
        const stick_x = player.x - player.normal_x * player.r * below_factor;
        const stick_y = player.y - player.normal_y * player.r * below_factor;
        const stick_r = player.r * radius_factor;
        const stick_circle = { x: stick_x, y: stick_y, r: stick_r };
        for (const line of world.lines) {
            const intersection = intersectLineCircle(line, stick_circle, true);
            if (intersection) stick_collisions.push({ intersection, shape: line });
        }

        if (stick_collisions.length > 0) {
            const avg_collision = stick_collisions.reduce((avg, collision) => {
                avg.x += collision.intersection.x;
                avg.y += collision.intersection.y;
                return avg;
            }, { x: 0, y: 0 });
            avg_collision.x /= stick_collisions.length;
            avg_collision.y /= stick_collisions.length;

            let normal_x = player.x - avg_collision.x;
            let normal_y = player.y - avg_collision.y;
            const normal_length = Math.hypot(normal_x, normal_y);
            if (normal_length > 0) {
                normal_x /= normal_length;
                normal_y /= normal_length;
                player.normal_x = lerp(1, player.normal_x, normal_x)
                player.normal_y = lerp(1, player.normal_y, normal_y);
            }
        }

        collisions.length = 0;
        for (const line of world.lines) {
            const intersection = intersectLineCircle(line, player, true);
            if (intersection) collisions.push({ intersection, shape: line });
        }

        const PUSH_DOWN_FACTOR = GRAVITY * 1;
        const MOVE_MAX_SPEED = 0.05;
        if (stick_collisions.length > 0) {
            if (right_pressed()) {
                const angle = Math.atan2(player.normal_y, player.normal_x) + Math.PI / 2;
                const new_vel_x = player.vel_x + Math.cos(angle) * PLAYER_SPEED;
                const new_vel_y = player.vel_y + Math.sin(angle) * PLAYER_SPEED;
                const new_vel = Math.hypot(new_vel_x, new_vel_y);
                if (new_vel <= MOVE_MAX_SPEED) {
                    player.vel_x = new_vel_x;
                    player.vel_y = new_vel_y;
                }
            }
            if (left_pressed()) {
                const angle = Math.atan2(player.normal_y, player.normal_x) - Math.PI / 2;
                const new_vel_x = player.vel_x + Math.cos(angle) * PLAYER_SPEED;
                const new_vel_y = player.vel_y + Math.sin(angle) * PLAYER_SPEED;
                const new_vel = Math.hypot(new_vel_x, new_vel_y);
                if (new_vel <= MOVE_MAX_SPEED) {
                    player.vel_x = new_vel_x;
                    player.vel_y = new_vel_y;
                }
            }
            if (up_pressed()) {
                const angle = Math.atan2(player.normal_y, player.normal_x);
                player.vel_x += Math.cos(angle) * JUMP_SPEED;
                player.vel_y += Math.sin(angle) * JUMP_SPEED;
            }

            // push player down onto surface
            player.vel_x -= player.normal_x * PUSH_DOWN_FACTOR;
            player.vel_y -= player.normal_y * PUSH_DOWN_FACTOR;

        } else {
            if (right_pressed()) {
                player.vel_x += PLAYER_AIR_SPEED;

                // rotate normal
                const angle = Math.atan2(player.normal_y, player.normal_x) + ROTATE_SPEED * Math.PI * 2;
                player.normal_x = Math.cos(angle);
                player.normal_y = Math.sin(angle);
            }
            if (left_pressed()) {
                player.vel_x -= PLAYER_AIR_SPEED;

                // rotate normal
                const angle = Math.atan2(player.normal_y, player.normal_x) - ROTATE_SPEED * Math.PI * 2;
                player.normal_x = Math.cos(angle);
                player.normal_y = Math.sin(angle);
            }
            if (up_pressed()) player.vel_y -= PLAYER_AIR_SPEED;
            if (down_pressed()) player.vel_y += PLAYER_AIR_SPEED;
        }

        player.vel_y += GRAVITY;

        for (const collision of collisions) {
            const { shape } = collision;

            const shape_normal = { x: shape.y2 - shape.y1, y: shape.x1 - shape.x2 };
            const normal_length = Math.hypot(shape_normal.x, shape_normal.y);
            shape_normal.x /= normal_length;
            shape_normal.y /= normal_length;

            const vel_dot_normal = player.vel_x * shape_normal.x + player.vel_y * shape_normal.y;

            const pos_dot_normal = (player.x - collision.intersection.x) * shape_normal.x + (player.y - collision.intersection.y) * shape_normal.y;
            if (Math.sign(vel_dot_normal) !== Math.sign(pos_dot_normal)) {
                player.vel_x -= vel_dot_normal * shape_normal.x;
                player.vel_y -= vel_dot_normal * shape_normal.y;

                // bounce with some energy loss
                // if (stick_collisions.length === 0) {
                //     player.vel_x -= vel_dot_normal * shape_normal.x * 0.75;
                //     player.vel_y -= vel_dot_normal * shape_normal.y * 0.75;
                // }

                // apply friction
                // player.vel_x *= 0.99;
                // player.vel_y *= 0.99;
            }
        }

        let vel_inc_x = player.vel_x;
        let vel_inc_y = player.vel_y;
        const vel_inc = Math.hypot(vel_inc_x, vel_inc_y);
        const MAX_VEL = player.r * 1;
        if (vel_inc > MAX_VEL) {
            vel_inc_x = vel_inc_x / vel_inc * MAX_VEL;
            vel_inc_y = vel_inc_y / vel_inc * MAX_VEL;
        }

        player.x += vel_inc_x;
        player.y += vel_inc_y;

        for (let i = 0; i < 1; i++) {
            push_out_collisions.length = 0;
            for (const line of world.lines) {
                const intersection = intersectLineCircle(line, player, true);
                if (intersection) push_out_collisions.push({ intersection, shape: line });
            }

            for (const collision of push_out_collisions) {
                const { intersection, shape } = collision;

                const shape_normal = { x: shape.y2 - shape.y1, y: shape.x1 - shape.x2 };
                const normal_length = Math.hypot(shape_normal.x, shape_normal.y);
                shape_normal.x /= normal_length;
                shape_normal.y /= normal_length;

                // push player out of collision
                const to_intersection = { x: intersection.x - player.x, y: intersection.y - player.y };
                const dist_to_intersection = Math.hypot(to_intersection.x, to_intersection.y);
                const overlap = player.r - dist_to_intersection;
                if (overlap > 0) {
                    const pos_dot_normal = (player.x - collision.intersection.x) * shape_normal.x + (player.y - collision.intersection.y) * shape_normal.y;
                    if (pos_dot_normal < 0) {
                        console.log("push out", overlap);
                        player.x -= shape_normal.x * overlap * 0.75;
                        player.y -= shape_normal.y * overlap * 0.75;
                    } else {
                        console.log("push out", overlap);
                        player.x += shape_normal.x * overlap * 0.75;
                        player.y += shape_normal.y * overlap * 0.75;
                    }
                }
            }
        }

        // push_out_collisions.length = 0;
        // for (const line of world.lines) {
        //     const intersection = intersectLineCircle(line, player, true);
        //     if (intersection) push_out_collisions.push({ intersection, shape: line });
        // }

        // avg_push_out_collision = undefined;
        // if (push_out_collisions.length > 0) {
        //     avg_push_out_collision = push_out_collisions.reduce((avg, collision) => {

        //         const { intersection, shape } = collision;

        //         console.log(intersection.x, intersection.y);
        //         avg.x += intersection.x;
        //         avg.y += intersection.y;

        //         const shape_normal = { x: shape.y2 - shape.y1, y: shape.x1 - shape.x2 };
        //         const normal_length = Math.hypot(shape_normal.x, shape_normal.y);
        //         if (normal_length > 0) {
        //             shape_normal.x /= normal_length;
        //             shape_normal.y /= normal_length;

        //             avg.normal_x += shape_normal.x
        //             avg.normal_y += shape_normal.y;
        //         }
        //         return avg;
        //     }, { x: 0, y: 0, normal_x: 0, normal_y: 0 });
        //     avg_push_out_collision.x /= push_out_collisions.length;
        //     avg_push_out_collision.y /= push_out_collisions.length;
        //     avg_push_out_collision.normal_x /= push_out_collisions.length;
        //     avg_push_out_collision.normal_y /= push_out_collisions.length;

        //     // push player out of collision
        //     const to_intersection = { x: avg_push_out_collision.x - player.x, y: avg_push_out_collision.y - player.y };
        //     const dist_to_intersection = Math.hypot(to_intersection.x, to_intersection.y);
        //     const overlap = player.r - dist_to_intersection;
        //     if (overlap > 0) {
        //         const pos_dot_normal = (player.x - avg_push_out_collision.x) * avg_push_out_collision.normal_x + (player.y - avg_push_out_collision.y) * avg_push_out_collision.normal_y;
        //         if (pos_dot_normal < 0) {
        //             player.x -= avg_push_out_collision.normal_x * overlap * 1;
        //             player.y -= avg_push_out_collision.normal_y * overlap * 1;
        //         } else {
        //             player.x += avg_push_out_collision.normal_x * overlap * 1;
        //             player.y += avg_push_out_collision.normal_y * overlap * 1;
        //         }
        //     }
        // }

        console.log({ avg_push_out_collision, len: push_out_collisions.length });
        return { player, world, collisions, stick_collisions, push_out_collisions, avg_push_out_collision };
    });

    const canvas = engine.draw(WIDTH, HEIGHT, (ctx) => {
        const layout = LAYOUT;

        const { player, world, collisions, push_out_collisions, avg_push_out_collision, stick_collisions } = state_par.get();

        ctx.translate(layout.getX(-player.x), layout.getY(-player.y + 0.25));

        ctx.lineCap = "round";
        ctx.fillStyle = "white";
        drawCircle(ctx, player, layout);
        const normal_line = { x1: player.x, y1: player.y, x2: player.x + player.normal_x * 0.1, y2: player.y + player.normal_y * 0.1 };
        ctx.strokeStyle = "green";
        drawLine(ctx, normal_line, layout);

        ctx.strokeStyle = "white";
        ctx.lineWidth = layout.getSize(0.01);
        drawShape(ctx, world, layout);
        ctx.strokeStyle = "blue";
        // drawShapeNormals(ctx, world, layout);

        ctx.strokeStyle = "red";
        const velocity_line = { x1: player.x, y1: player.y, x2: player.x + player.vel_x, y2: player.y + player.vel_y };
        drawLine(ctx, velocity_line, layout);

        // ctx.fillStyle = "yellow";
        // collisions.forEach(collision => {
        //     const { intersection } = collision;
        //     drawCircle(ctx, { x: intersection.x, y: intersection.y, r: 0.01 }, layout);
        // });

        ctx.fillStyle = "red";
        push_out_collisions.forEach(collision => {
            const { intersection } = collision;
            drawCircle(ctx, { x: intersection.x, y: intersection.y, r: 0.01 }, layout);
        });

        if (avg_push_out_collision) {
            ctx.fillStyle = "magenta";
            drawCircle(ctx, { x: avg_push_out_collision.x, y: avg_push_out_collision.y, r: 0.01 }, layout);
            ctx.strokeStyle = "magenta";
            drawLine(ctx, {
                x1: avg_push_out_collision.x,
                y1: avg_push_out_collision.y,
                x2: avg_push_out_collision.x + avg_push_out_collision.normal_x * 0.1,
                y2: avg_push_out_collision.y + avg_push_out_collision.normal_y * 0.1
            }, layout);
        }

        // ctx.fillStyle = "orange";
        // stick_collisions.forEach(collision => {
        //     const { intersection } = collision;
        //     drawCircle(ctx, { x: intersection.x, y: intersection.y, r: 0.01 }, layout);
        // });

        ctx.resetTransform();
    })

    ui.mountCanvas(canvas);
});

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

function intersectLineCircle(line: Line, circle: Circle, check_inside: boolean) {
    const { x1, y1, x2, y2 } = line;
    const { x: cx, y: cy, r } = circle;


    // if inside circle
    if (check_inside) {
        const dist_to_center_1 = Math.hypot(cx - x1, cy - y1);
        const dist_to_center_2 = Math.hypot(cx - x2, cy - y2);
        if (dist_to_center_1 < r && dist_to_center_2 < r) {
            const avg_x = (x1 + x2) / 2;
            const avg_y = (y1 + y2) / 2;
            return { x: avg_x, y: avg_y };
        }
    }

    const LAB = Math.hypot(x2 - x1, y2 - y1);
    const Dx = (x2 - x1) / LAB;
    const Dy = (y2 - y1) / LAB;

    const t = Dx * (cx - x1) + Dy * (cy - y1);

    const Ex = t * Dx + x1;
    const Ey = t * Dy + y1;

    const LEC = Math.hypot(Ex - cx, Ey - cy);

    if (LEC < r) {
        const dt = Math.sqrt(r * r - LEC * LEC);
        const intersection1 = { x: Ex - dt * Dx, y: Ey - dt * Dy };
        const intersection2 = { x: Ex + dt * Dx, y: Ey + dt * Dy };

        const on_segment1 = isPointOnLineSegment(intersection1, line);
        const on_segment2 = isPointOnLineSegment(intersection2, line);

        if (on_segment1 && on_segment2) {
            return { x: (intersection1.x + intersection2.x) / 2, y: (intersection1.y + intersection2.y) / 2 };
            // return [intersection1, intersection2];
        } else if (on_segment1) {
            return intersection1;
            // return [intersection1];
        } else if (on_segment2) {
            return intersection2;
            // return [intersection2];
        }
    }

    return false;
}

function isPointOnLineSegment(point: { x: number, y: number }, line: Line) {
    const { x1, y1, x2, y2 } = line;
    const cross_product = (point.y - y1) * (x2 - x1) - (point.x - x1) * (y2 - y1);
    if (Math.abs(cross_product) > 0.00001) return false;

    const dot_product = (point.x - x1) * (x2 - x1) + (point.y - y1) * (y2 - y1);
    if (dot_product < 0) return false;

    const squared_length = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (dot_product > squared_length) return false;

    return true;
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

function getPolygon(cx: number, cy: number, sides: number, radius: number, rotation: number, arc: number) {
    const lines: Line[] = [];
    const getAngle = (f: number) => rotation - f * arc;
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

function drawCircle(ctx: CanvasRenderingContext2D, circle: Circle, layout: Layout) {
    ctx.beginPath();
    ctx.arc(layout.getX(circle.x), layout.getY(circle.y), layout.getSize(circle.r), 0, Math.PI * 2);
    ctx.fill();
}

function drawLine(ctx: CanvasRenderingContext2D, line: Line, layout: Layout) {
    ctx.beginPath();
    ctx.moveTo(layout.getX(line.x1), layout.getY(line.y1));
    ctx.lineTo(layout.getX(line.x2), layout.getY(line.y2));
    ctx.stroke();
}


function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, layout: Layout) {
    for (const line of shape.lines) {
        drawLine(ctx, line, layout);
    }
    // ctx.beginPath();
    // const firstLine = shape.lines[0];
    // ctx.moveTo(layout.getX(firstLine.x1), layout.getY(firstLine.y1));
    // for (const line of shape.lines)
    //     ctx.lineTo(layout.getX(line.x2), layout.getY(line.y2));
    // // ctx.closePath();
    // ctx.stroke();
}

function drawShapeNormals(ctx: CanvasRenderingContext2D, shape: Shape, layout: Layout) {
    ctx.strokeStyle = "blue";
    for (const line of shape.lines) {
        const mid_x = (line.x1 + line.x2) / 2;
        const mid_y = (line.y1 + line.y2) / 2;
        const normal_x = line.y2 - line.y1;
        const normal_y = line.x1 - line.x2;
        const normal_length = Math.hypot(normal_x, normal_y);
        const norm_x = normal_x / normal_length * layout.getSize(0.0001);
        const norm_y = normal_y / normal_length * layout.getSize(0.0001);
        drawLine(ctx, { x1: mid_x, y1: mid_y, x2: mid_x + norm_x, y2: mid_y + norm_y }, layout);
    }
}