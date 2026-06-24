
import { l } from "vite/dist/node/types.d-jgA8ss1A";
import { createAnimationFrameParameter, createCanvas, createSketch } from "../../rendr/rendr";
import { angle_diff, clamp, cos, cosn, createColor, createHSL, getLayout, inv_cosn, LayoutType, lerp, lerpColor, map, mod, n_arr, sin, sinn, tri } from "../../rendr/utils";

const GLOBAL_FRAMES = 1500;
const GLOBAL_FPS = 60;

// ... square ...
// const WIDTH = 1080;
// const HEIGHT = 1080;

// ... portraid ...
// const WIDTH = 1080;
// const HEIGHT = 1920;

// ... landscape ...
// const WIDTH = 1920;
// const HEIGHT = 1080;

// ... fit screen ...
const WIDTH = window.outerWidth;
const HEIGHT = window.outerHeight;

const PAD = 10;
const LAYOUT = makeLayout("stretch", PAD, PAD, WIDTH - PAD, HEIGHT - PAD);

// ... video ...
const LOOPS = 1;


type Layout = ReturnType<typeof makeLayout>;

function makeLayout(type: LayoutType, start_x: number, start_y: number, end_x: number, end_y: number) {
    const width = end_x - start_x;
    const height = end_y - start_y;

    switch (type) {
        case "stretch":
            const size = Math.min(width, height);
            return {
                getX: (x: number) => lerp(x, start_x, end_x),
                getY: (y: number) => lerp(y, start_y, end_y),
                getWidth: (w: number) => lerp(w, 0, width),
                getHeight: (w: number) => lerp(w, 0, height),
                getSize: (s: number) => lerp(s, 0, size),
                start_x,
                start_y,
                end_x,
                end_y,
            }
        case "fit": {
            const size = Math.min(width, height);
            const offset_x = (width - size) / 2;
            const offset_y = (height - size) / 2;
            return {
                getX: (x: number) => lerp(x, start_x, start_x + size) + offset_x,
                getY: (y: number) => lerp(y, start_y, start_y + size) + offset_y,
                getWidth: (w: number) => lerp(w, 0, size),
                getHeight: (w: number) => lerp(w, 0, size),
                getSize: (s: number) => lerp(s, 0, size),
                start_x,
                start_y,
                end_x,
                end_y,
            }
        }
        case "fill": {
            const size = Math.max(width, height);
            const offset_x = (width - size) / 2;
            const offset_y = (height - size) / 2;
            return {
                getX: (x: number) => lerp(x, start_x, start_x + size) + offset_x,
                getY: (y: number) => lerp(y, start_y, start_y + size) + offset_y,
                getWidth: (w: number) => lerp(w, 0, size),
                getHeight: (w: number) => lerp(w, 0, size),
                getSize: (s: number) => lerp(s, 0, size),
                start_x,
                start_y,
                end_x,
                end_y,
            }
        }
        default:
            throw new Error(`Unknown layout type: ${type}`);
    }
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

    const frame_par = createAnimationFrameParameter(FRAMES * LOOPS, FPS);

    const initSnakeGame = (index: number, total: number) => {
        const rows = 25;
        const cols = 25;
        const ratio = total <= 1 ? 0 : index / (total - 1);
        const start_x = mod(25 + index * 7 + Math.floor(ratio * rows), rows);
        const start_y = mod(25 + index * 11 + Math.floor((1 - ratio) * cols), cols);
        const snake_count = Math.round(lerp(ratio, MIN_SNAKE_COUNT, MAX_SNAKE_COUNT));
        const food_count = Math.round(lerp(ratio, MIN_FOOD_COUNT, MAX_FOOD_COUNT));
        return new SnakeGame(rows, cols, start_x, start_y, snake_count, food_count);
    };
    const initSnakeGames = (count: number) => Array.from({ length: count }, (_, index) => initSnakeGame(index, count));

    let games = initSnakeGames(DEFAULT_GAME_COUNT);

    if (REALTIME) {
        const canvas = engine.draw(WIDTH, HEIGHT, (ctx, props) => {
            const { width, height } = props;

            // clear screen
            ctx.fillStyle = createColor(0);
            ctx.fillRect(0, 0, width, height);

            const index = frame_par.get();
            const t = mod(index / FRAMES);

            const STEPS = 3;
            games.forEach((game, game_index) => {
                for (let i = 0; i < STEPS; i++) {
                    game.runAI();
                    if (!game.step()) {
                        games[game_index] = initSnakeGame(game_index, games.length);
                        break;
                    }
                }
            });

            scene(games, ctx, t, LAYOUT);
        })
        ui.mountCanvas(canvas);
    }

    // if (ANIMATION) {
    //     const animation = engine.animate(WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
    //         const { index } = props;
    //         const t = mod(index / FRAMES);
    //         scene(ctx, t, LAYOUT);
    //     })
    //     ui.mountCanvasAnimation(animation, frame_par);
    // }

    // if (VIDEO) {
    //     const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
    //         const { index } = props;
    //         const t = mod(index / FRAMES);
    //         scene(ctx, t, LAYOUT);
    //     })
    //     ui.mountVideo(video);
    // }
});

type Point = { x: number, y: number };

type Snake = {
    positions: Point[];
    length: number;
    direction: Point;
};

const DEFAULT_SNAKE_COUNT = 1;
const DEFAULT_FOOD_COUNT = 1;
const DEFAULT_GAME_COUNT = 1;
const MIN_SNAKE_COUNT = 1;
const MAX_SNAKE_COUNT = 1;
const MIN_FOOD_COUNT = 1;
const MAX_FOOD_COUNT = 1;

class SnakeGame {
    snakes: Snake[] = [];
    foods: Point[] = [];

    constructor(
        readonly rows: number,
        readonly cols: number,
        private readonly start_x: number,
        private readonly start_y: number,
        private readonly snake_count: number = DEFAULT_SNAKE_COUNT,
        private readonly food_count: number = DEFAULT_FOOD_COUNT,
    ) {
        this.reset();
    }

    reset() {
        this.snakes = this.createSnakes(this.snake_count);
        const occupied_positions = this.snakes.flatMap(snake => snake.positions);
        this.foods = this.createFoods(occupied_positions, this.food_count);
    }

    runAI() {
        if (this.foods.length === 0) return;

        const occupied_positions = this.snakes.flatMap(snake => snake.positions);

        this.snakes.forEach(snake => {
            const head = snake.positions.at(-1);
            if (!head) throw new Error("Snake has no head");

            const target_food = this.foods.reduce((closest, candidate) => {
                const closest_distance = Math.abs(head.x - closest.x) + Math.abs(head.y - closest.y);
                const candidate_distance = Math.abs(head.x - candidate.x) + Math.abs(head.y - candidate.y);
                return candidate_distance < closest_distance ? candidate : closest;
            }, this.foods[0]);

            const possible_directions = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 },
            ];

            const own_head = snake.positions.at(-1);
            if (!own_head) throw new Error("Snake has no head");
            const blocked_positions = occupied_positions.filter(pos => !(pos.x === own_head.x && pos.y === own_head.y));

            const valid_directions = possible_directions.filter(dir => {
                const new_head = {
                    x: mod(head.x + dir.x, this.rows),
                    y: mod(head.y + dir.y, this.cols)
                };
                return !this.checkCollision(blocked_positions, new_head.x, new_head.y);
            });

            if (valid_directions.length === 0) return;

            const best_direction = valid_directions.reduce((best, dir) => {
                const new_head = {
                    x: mod(head.x + dir.x, this.rows),
                    y: mod(head.y + dir.y, this.cols)
                };
                const best_new_head = {
                    x: mod(head.x + best.x, this.rows),
                    y: mod(head.y + best.y, this.cols)
                };
                const best_distance = Math.abs(best_new_head.x - target_food.x) + Math.abs(best_new_head.y - target_food.y);
                const new_distance = Math.abs(new_head.x - target_food.x) + Math.abs(new_head.y - target_food.y);
                return new_distance < best_distance ? dir : best;
            }, valid_directions[0]);

            snake.direction = best_direction;
        });
    }

    step() {
        const occupied_positions = this.snakes.flatMap(snake => snake.positions);

        const planned_moves = this.snakes.map(snake => {
            const head = snake.positions.at(-1);
            if (!head) throw new Error("Snake has no head");

            const new_head = {
                x: mod(head.x + snake.direction.x, this.rows),
                y: mod(head.y + snake.direction.y, this.cols)
            };

            const eaten_food = this.foods.find(food => food.x === new_head.x && food.y === new_head.y);

            return { snake, new_head, eaten_food };
        });

        const head_counts = new Map<string, number>();
        planned_moves.forEach(move => {
            const key = `${move.new_head.x},${move.new_head.y}`;
            head_counts.set(key, (head_counts.get(key) ?? 0) + 1);
        });

        const next_snakes: Snake[] = [];
        const eaten_food_keys = new Set<string>();

        planned_moves.forEach(move => {
            const key = `${move.new_head.x},${move.new_head.y}`;
            const collides_with_body = this.checkCollision(occupied_positions, move.new_head.x, move.new_head.y);
            const collides_with_head = (head_counts.get(key) ?? 0) > 1;
            if (collides_with_body || collides_with_head)
                return;

            if (move.eaten_food)
                move.snake.length += 1;

            move.snake.positions.push(move.new_head);
            if (move.snake.positions.length > move.snake.length)
                move.snake.positions.shift();

            if (move.eaten_food)
                eaten_food_keys.add(`${move.eaten_food.x},${move.eaten_food.y}`);

            next_snakes.push(move.snake);
        });

        this.snakes = next_snakes;

        if (eaten_food_keys.size > 0) {
            this.foods = this.foods.filter(food => !eaten_food_keys.has(`${food.x},${food.y}`));
            while (this.foods.length < this.food_count) {
                const occupied = [...this.snakes.flatMap(snake => snake.positions), ...this.foods];
                this.foods.push(this.createFood(occupied));
            }
        }

        return this.snakes.length > 0;
    }

    private createSnakes(count: number) {
        const snakes: Snake[] = [];
        const occupied_positions: Point[] = [];
        const directions: Point[] = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        for (let i = 0; i < count; i++) {
            const spawn = i === 0
                ? { x: mod(this.start_x, this.rows), y: mod(this.start_y, this.cols) }
                : this.createFood(occupied_positions);

            if (this.checkCollision(occupied_positions, spawn.x, spawn.y))
                continue;

            snakes.push({
                positions: [spawn],
                length: 1,
                direction: directions[i % directions.length],
            });
            occupied_positions.push(spawn);
        }

        if (snakes.length === 0) {
            snakes.push({
                positions: [{ x: mod(this.start_x, this.rows), y: mod(this.start_y, this.cols) }],
                length: 1,
                direction: { x: 1, y: 0 },
            });
        }

        return snakes;
    }

    private createFood(occupied_positions: Point[]) {
        let x = Math.floor(Math.random() * this.rows);
        let y = Math.floor(Math.random() * this.cols);
        while (this.checkCollision(occupied_positions, x, y)) {
            x = Math.floor(Math.random() * this.rows);
            y = Math.floor(Math.random() * this.cols);
        }
        return { x, y };
    }

    private createFoods(occupied_positions: Point[], count: number) {
        const foods: Point[] = [];
        for (let i = 0; i < count; i++) {
            foods.push(this.createFood([...occupied_positions, ...foods]));
        }
        return foods;
    }

    private checkCollision(positions: Point[], x: number, y: number) {
        return positions.some(pos => pos.x === x && pos.y === y);
    }
}

function scene(games: SnakeGame[], ctx: CanvasRenderingContext2D, t: number, layout: Layout) {

    const gap = 10;

    const cols = Math.ceil(Math.sqrt(games.length));
    const rows = Math.ceil(games.length / cols);

    // drawBorder(ctx, layout);
    layoutCol(layout, "fit", gap, [
        (layout) => layoutGrid(layout, "stretch", rows, cols, gap, games.map(game =>
            (layout) => drawSnakeGame(game, ctx, layout),
        )),
    ])
}

function drawSnakeGame(game: SnakeGame, ctx: CanvasRenderingContext2D, layout: Layout) {

    const { snakes, rows, cols } = game;

    const cell_w = layout.getWidth(1) / cols;
    const cell_h = layout.getHeight(1) / rows;

    // draw grid
    // ctx.strokeStyle = createColor(255);
    // ctx.lineWidth = 1;
    // for (let r = 0; r <= rows; r++) {
    //     const y = layout.getY(r / rows);
    //     ctx.beginPath();
    //     ctx.moveTo(layout.getX(0), y);
    //     ctx.lineTo(layout.getX(1), y);
    //     ctx.stroke();
    // }
    // for (let c = 0; c <= cols; c++) {
    //     const x = layout.getX(c / cols);
    //     ctx.beginPath();
    //     ctx.moveTo(x, layout.getY(0));
    //     ctx.lineTo(x, layout.getY(1));
    //     ctx.stroke();
    // }

    // draw snakes
    const pad = 1;
    snakes.forEach((snake, index) => {
        const hue = mod(index / Math.max(1, snakes.length)) / 3 + 0.33;
        ctx.fillStyle = createHSL(hue, 1, 0.5);
        snake.positions.forEach(pos => {
            const x = layout.getX(pos.x / cols);
            const y = layout.getY(pos.y / rows);
            ctx.fillRect(x + pad, y + pad, cell_w - pad * 2, cell_h - pad * 2);
        });
    });

    // draw foods
    ctx.fillStyle = createColor(1, 0, 0);
    game.foods.forEach(food => {
        const food_x = layout.getX(food.x / cols);
        const food_y = layout.getY(food.y / rows);
        ctx.fillRect(food_x + pad, food_y + pad, cell_w - pad * 2, cell_h - pad * 2);
    });

    drawBorder(ctx, layout);
}


function layoutGrid(layout: Layout, layoutType: LayoutType, rows: number, cols: number, gap: number, items: ((layout: Layout) => void)[]) {
    const x = layout.getX(0);
    const y = layout.getY(0);
    const w = layout.getWidth(1);
    const h = layout.getHeight(1);

    const cell_w = (w - gap * (cols - 1)) / cols;
    const cell_h = (h - gap * (rows - 1)) / rows;
    items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cell_x = x + col * (cell_w + gap);
        const cell_y = y + row * (cell_h + gap);
        const grid_layout = makeLayout(layoutType, cell_x, cell_y, cell_x + cell_w, cell_y + cell_h);
        item(grid_layout);
    });
}

function layoutRow(layout: Layout, layoutType: LayoutType, gap: number, items: ((layout: Layout) => void)[]) {
    const cols = items.length;
    const rows = 1;
    layoutGrid(layout, layoutType, rows, cols, gap, items);
}

function layoutCol(layout: Layout, layoutType: LayoutType, gap: number, items: ((layout: Layout) => void)[]) {
    const cols = 1;
    const rows = items.length;
    layoutGrid(layout, layoutType, rows, cols, gap, items);
}

function drawBorder(ctx: CanvasRenderingContext2D, layout: Layout) {
    const x = layout.start_x;
    const y = layout.start_y;
    const w = layout.end_x - layout.start_x;
    const h = layout.end_y - layout.start_y;

    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.stroke();
}