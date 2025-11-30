import { createAnimationFrameParameter, createSketch } from "../../rendr/rendr";
import { clamp, cos, createColor, getLayout, inv_cosn, Layout, lerp, lerpColor, map, mod, n_arr, sin, sinn, tri } from "../../rendr/utils";

const GLOBAL_FRAMES = 500;
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

// ... video ...
const LOOPS = 1;

// ... global params ...
const INITIAL_NODES_RADIUS = 0.05;
const INITIAL_NODES_COUNT = 5;

const CONTRACT_DIST_MIN = 0.005;
const AVOID_DIST_MIN = 0.015;

const CONTRACT_FACTOR_MIN = 0.25;
const AVOID_FACTOR_MIN = 0.25;

const DIST_MULT = 5;
const CONTRACT_DIST_MAX = CONTRACT_DIST_MIN * DIST_MULT;
const AVOID_DIST_MAX = AVOID_DIST_MIN * DIST_MULT;

const FACTOR_MULT = 1 / (DIST_MULT);
const CONTRACT_FACTOR_MAX = CONTRACT_FACTOR_MIN * FACTOR_MULT;
const AVOID_FACTOR_MAX = AVOID_FACTOR_MIN * FACTOR_MULT;

// ... types ...
type Node = {
    x: number;
    y: number;
}

type Props = {
    REALTIME?: boolean,
    ANIMATION?: boolean,
    VIDEO?: boolean,
}

// ... sketch ...
export default createSketch<Props>((engine, ui, props) => {
    const { REALTIME, ANIMATION, VIDEO } = props;

    const FPS = 60;
    const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;

    const getInitalPos = (f: number) => ({
        x: 0.5 + cos(f) * INITIAL_NODES_RADIUS,
        y: 0.5 + sin(f) * INITIAL_NODES_RADIUS,
    })
    const initial_nodes: Node[] = n_arr(INITIAL_NODES_COUNT, (_, f) => getInitalPos(f));

    const frame_par = createAnimationFrameParameter(FRAMES * LOOPS, FPS);

    if (REALTIME) {
        const MAX_NODES = 750;
        const LAYOUT = getLayout('fit', WIDTH, HEIGHT);

        const nodes_par = engine.update<Node[]>(initial_nodes, (nodes) => {
            const frame = Math.floor(frame_par.get());
            const t = mod(frame / FRAMES);

            manageNodeCount(nodes, t, INITIAL_NODES_COUNT, MAX_NODES, LAYOUT);
            step(nodes, LAYOUT);
        });

        const canvas = engine.draw(WIDTH, HEIGHT, (ctx, props) => {
            const { width, height } = props;

            ctx.fillStyle = createColor(0);
            ctx.fillRect(0, 0, width, height);

            const nodes = nodes_par.get();
            const nodes_f = nodes.length / MAX_NODES;

            const lineWidth = stackLineWidth(1);
            const getColor = (f: number) => getGradient(f, 1, nodes_f);

            drawLines(ctx, nodes, lineWidth, getColor, LAYOUT);
            // drawCircles(ctx, nodes, getColor, LAYOUT);
        });

        ui.createView(canvas);
    }

    if (ANIMATION || VIDEO) {
        const MAX_NODES = 1000;
        const STACK_COUNT = 50;
        const REST_FRAMES = 25;
        const LAYOUT = getLayout('fit', WIDTH, HEIGHT);

        const nodes_cache = engine.simulate<Node[]>(initial_nodes, FRAMES * LOOPS, (nodes, props) => {
            const { index, max_steps } = props;
            const t = mod(index / FRAMES);

            manageNodeCount(nodes, t, INITIAL_NODES_COUNT, MAX_NODES, LAYOUT);

            if (index > max_steps - REST_FRAMES) {
                const reset_t = (index - (max_steps - REST_FRAMES)) / REST_FRAMES;
                const reset_f = Math.pow(reset_t, 2);
                for (let i = 0; i < nodes.length; i++) {
                    const node = nodes[i];
                    const f = i / nodes.length;

                    const initial_pos = getInitalPos(f);
                    moveNodes(node, initial_pos, 0, reset_f, true, true);
                }
            }

            step(nodes, LAYOUT);
        });

        if (ANIMATION) {
            const canvas_cache = engine.animate(WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
                const { index, max_steps } = props;

                for (let i = 0; i < STACK_COUNT; i++) {
                    const frame_index = index - STACK_COUNT + i;
                    if (frame_index < 0) continue;
                    const nodes = nodes_cache.get(mod(frame_index, max_steps));

                    const stack_f = i / (STACK_COUNT - 1);
                    const nodes_f = nodes.length / MAX_NODES;

                    const offset = stackOffset(stack_f);
                    LAYOUT.offset_x = offset;
                    LAYOUT.offset_y = offset;

                    const lineWidth = stackLineWidth(stack_f);
                    const getColor = (f: number) => getGradient(f, stack_f, nodes_f);

                    drawLines(ctx, nodes, lineWidth, getColor, LAYOUT);
                }
            });

            ui.createCacheView(canvas_cache, frame_par);
        }

        if (VIDEO) {
            const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
                const { index, max_steps } = props;

                for (let i = 0; i < STACK_COUNT; i++) {
                    const frame_index = index - STACK_COUNT + i;
                    const nodes = nodes_cache.get(mod(frame_index, max_steps));

                    const stack_f = i / (STACK_COUNT - 1);
                    const nodes_f = nodes.length / MAX_NODES;

                    const offset = stackOffset(stack_f);
                    LAYOUT.offset_x = offset;
                    LAYOUT.offset_y = offset;

                    const lineWidth = stackLineWidth(stack_f);
                    const getColor = (f: number) => getGradient(f, stack_f, nodes_f);

                    drawLines(ctx, nodes, lineWidth, getColor, LAYOUT);
                }
            });

            ui.createVideo(video);
        }
    }
});

const nodeSig = (node: Node, f: number) => sinn(f * 3);
const stackOffset = (f: number) => (0.5 - f) * -0.1;

const stackLineWidth = (f: number) => 0.01 + (1 - f) * 0.01;
// const stackLineWidth = (f: number) => 0.005 + (1 - f) * 0.01;
// const stackLineWidth = (f: number) => 0.0025 + (1 - f) * 0.01;

function manageNodeCount(nodes: Node[], t: number, min_nodes: number, max_nodes: number, layout: Layout) {
    const count_f = inv_cosn(t);
    const count = Math.floor(map(count_f, min_nodes, max_nodes));

    while (nodes.length < count) {
        addNode(nodes);
        step(nodes, layout)
    }
    while (nodes.length > count) {
        removeNode(nodes);
        step(nodes, layout)
    }
}

function addNode(nodes: Node[]) {
    const split_node = nodes.reduce((best, node, i) => {
        const next_node = nodes[(i + 1) % nodes.length];
        const dist = Math.hypot(next_node.x - node.x, next_node.y - node.y);
        if (dist < best.dist) return best;
        return { node, index: i, dist };
    }, { node: nodes[0], index: 0, dist: 0 });

    const { index } = split_node

    const node = nodes[index];
    const next_node = nodes[(index + 1) % nodes.length];

    const new_node = {
        x: (node.x + next_node.x) / 2,
        y: (node.y + next_node.y) / 2,
    };

    nodes.splice(index + 1, 0, new_node);
}

function removeNode(nodes: Node[]) {
    const split_node = nodes.reduce((best, node, i) => {
        const next_node = nodes[(i + 1) % nodes.length];
        const dist = Math.hypot(next_node.x - node.x, next_node.y - node.y);
        if (dist > best.dist) return best;
        return { node, index: i, dist };
    }, { node: nodes[0], index: 0, dist: Infinity });

    const { index } = split_node

    nodes.splice(index, 1);
}

function step(nodes: Node[], layout: Layout) {
    contract(nodes)
    avoid(nodes);

    const { width, height, size } = layout
    const pad = 0.3;
    const pad_x = width / size - 1 - pad;
    const pad_y = height / size - 1 - pad;

    for (const node of nodes) {
        node.x = clamp(node.x, -pad_x * 0.5, 1 + pad_x * 0.5);
        node.y = clamp(node.y, -pad_y * 0.5, 1 + pad_y * 0.5);
    }
}

function contract(nodes: Node[]) {
    for (let i = 0; i < nodes.length; i++) {
        const node1 = nodes[i];
        const f = i / nodes.length;

        const contract_f = nodeSig(node1, f);
        const dist = map(contract_f, CONTRACT_DIST_MIN, CONTRACT_DIST_MAX);
        const factor = map(contract_f, CONTRACT_FACTOR_MIN, CONTRACT_FACTOR_MAX);

        const node2 = nodes[mod(i + 1, nodes.length)];
        moveNodes(node1, node2, dist, factor, true, true);

        const node3 = nodes[mod(i - 1, nodes.length)];
        moveNodes(node1, node3, dist, factor, true, true);
    }
}

function avoid(nodes: Node[]) {
    for (let i = 0; i < nodes.length; i++) {
        const node1 = nodes[i];
        const f = i / nodes.length;

        const avoid_f = nodeSig(node1, f);
        const dist = map(avoid_f, AVOID_DIST_MIN, AVOID_DIST_MAX);
        const factor = map(avoid_f, AVOID_FACTOR_MIN, AVOID_FACTOR_MAX);

        for (let j = 0; j < nodes.length; j++) {
            const node2 = nodes[j];
            if (node1 === node2) continue;
            moveNodes(node1, node2, dist, factor, false, true);
        }
    }
}

function moveNodes(
    node1: Node, node2: Node,
    target_dist: number, move_factor: number,
    towards: boolean, away: boolean
) {
    const diff_x = node2.x - node1.x;
    const diff_y = node2.y - node1.y;

    const dist = Math.hypot(diff_x, diff_y);
    if (dist === 0) return;

    const move_dist = (dist - target_dist) * move_factor;
    if (move_dist === 0) return;
    if (move_dist < 0 && !away) return;
    if (move_dist > 0 && !towards) return;

    const move_x = (diff_x / dist) * move_dist;
    const move_y = (diff_y / dist) * move_dist;

    node1.x += move_x;
    node1.y += move_y;
    node2.x -= move_x;
    node2.y -= move_y;
}

function drawLines(ctx: CanvasRenderingContext2D, nodes: Node[], lineWidth: number, getColor: (f: number) => string, layout: Layout) {
    for (let i = 0; i < nodes.length; i++) {
        const node1 = nodes[i];
        const node2 = nodes[mod(i + 1, nodes.length)];

        const f = i / nodes.length;
        const node_f = nodeSig(node1, f);

        ctx.beginPath();
        ctx.moveTo(layout.getX(node1.x), layout.getY(node1.y));
        ctx.lineTo(layout.getX(node2.x), layout.getY(node2.y));

        ctx.lineWidth = layout.getSize(lineWidth);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = getColor(node_f);
        ctx.stroke();
    }

}

function drawCircles(ctx: CanvasRenderingContext2D, nodes: Node[], getColor: (f: number) => string, layout: Layout) {
    for (let i = 0; i < nodes.length; i++) {
        const f = i / nodes.length;

        const node = nodes[i];
        const { x, y } = node;

        const node_f = nodeSig(node, f);
        const size_min = 0.005;
        const size_max = 0.005 * (1 + (DIST_MULT - 1) * 0.75);
        const size = map(node_f, size_min, size_max);

        ctx.beginPath();
        ctx.arc(layout.getX(x), layout.getY(y), layout.getSize(size), 0, Math.PI * 2);

        ctx.fillStyle = getColor(node_f);
        ctx.fill();
    }
}

function getGradient(f: number, stack_f: number, nodes_f: number) {
    const col1 = [1.0, 0.0, 0.5];
    const col2 = [1.0, 0.5, 0.0];

    // const fade_f = Math.pow(stack_f, 2);
    const fade_f = stack_f;

    const col3 = [lerp(fade_f, 0.5, 1), lerp(fade_f, 0, 1), lerp(fade_f, 1.0, 1)];

    const color_f = Math.pow(stack_f, 2);

    return lerpColor(tri(f) * Math.pow(nodes_f, 0.5),
        lerp(color_f, col3[0], col1[0]), lerp(color_f, col3[1], col1[1]), lerp(color_f, col3[2], col1[2]),
        lerp(color_f, col3[0], col2[0]), lerp(color_f, col3[1], col2[1]), lerp(color_f, col3[2], col2[2]),
    );
}