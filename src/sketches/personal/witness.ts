import { createSketch } from "../../rendr/rendr";
import { getLayout, map, n_arr } from "../../rendr/utils";

const WIDTH = 1080;
const HEIGHT = 1080;
const MAX_STEPS = 10000;

const COLS = 5;
const ROWS = 5;

const PAD = 0.25;
const LAYOUT = getLayout("fit", WIDTH, HEIGHT, PAD, COLS - 1, ROWS - 1);

type State = {
    index: number;
    nodes: { x: number; y: number; parent: { x: number; y: number; parent: any; } | null; }[];
}

export default createSketch((engine, ui) => {

    // const grid = n_arr(COLS, i => n_arr(ROWS, j => {
    //     return false;
    // }));

    const target_x = COLS - 1;
    const target_y = ROWS - 1;

    const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
    ];

    const state_par = engine.construct<State>({
        index: 0,
        nodes: [{ x: 0, y: 0, parent: null }]
    }, MAX_STEPS, (state, props) => {
        const { index, nodes } = state;
        const { done } = props;

        const node = nodes[nodes.length - 1];

        const next_direction = directions[Math.floor(Math.random() * directions.length)];
        const next_node = {
            x: node.x + next_direction.x,
            y: node.y + next_direction.y,
            parent: node,
        };

        if (next_node.x < 0 || next_node.x >= COLS || next_node.y < 0 || next_node.y >= ROWS) return;
        if (nodes.find(n => n.x === next_node.x && n.y === next_node.y)) return;

        nodes.push(next_node)

        if (next_node.x === target_x, next_direction.y === target_y) done();
    })

    const view = engine.draw(WIDTH, HEIGHT, (ctx, props) => {
        const { screenX, screenY } = LAYOUT;

        const state = state_par.get();
        const { nodes } = state;

        ctx.beginPath();
        ctx.moveTo(screenX(nodes[0].x), screenY(nodes[0].y));
        nodes.map(node => ctx.lineTo(screenX(node.x), screenY(node.y)))

        ctx.strokeStyle = "rgb(125, 0, 255)";
        ctx.lineWidth = 50;
        ctx.lineCap = "square"

        ctx.stroke();
    })

    ui.createView(view)
});