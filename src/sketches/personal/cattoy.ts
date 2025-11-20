import { createLoop, createAnimationLoop, createParameter, createSketch, AnimateProps, VideoProps } from "../../rendr/rendr";
import { for_n, lerp, sinn, cosn, getLayout, n_arr, Layout } from "../../rendr/utils";


const GLOBAL_FRAMES = 1500;
const GLOBAL_FPS = 60;
const REFRESH_RATE = 120;

// update
const OFFSSET_R = 1;
const SMOOTHING = 0.15;
const BUFFER_LENGTH = 200;

type Props = {
  ANIMATION: boolean,
  VIDEO: boolean,
  REALTIME: boolean,
}

type Position = {
  x: number,
  y: number,
}

export default createSketch<Props>((engine, ui, props) => {
  const { ANIMATION, VIDEO, REALTIME } = props;

  if (ANIMATION || VIDEO) {
    const WIDTH = 1080;
    const HEIGHT = 1920;
    const LAYOUT = getLayout("fill", WIDTH, HEIGHT);

    const FPS = 60;
    const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;

    function scene(t: number, positions: Position[]) {
      const input_x = sinn(t * 8)
      const input_y = cosn(t * 10)
      update(input_x, input_y, positions)
    }

    const initial_positions: Position[] = [];
    for_n(FRAMES, i => scene(i / FRAMES, initial_positions));

    const state = engine.simulate(initial_positions, FRAMES, (positions, props) => {
      const { index } = props;
      const t = index / FRAMES;
      scene(t, positions);
    });

    function render(ctx: CanvasRenderingContext2D, props: AnimateProps | VideoProps) {
      const { index } = props;

      const t = index / FRAMES;
      const positions = state.get(index);

      draw(ctx, t, positions, LAYOUT);
    }

    if (ANIMATION) {
      const animation = engine.animate(WIDTH, HEIGHT, FRAMES, render);

      const frame_par = createParameter(0);
      createLoop(() => frame_par.set(frame => (frame + 1) % FRAMES), 1000 / FPS);
      ui.createCacheView(animation, frame_par);
    }

    if (VIDEO) {
      const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES, render);
      ui.createVideo(video);
    }
  }

  if (REALTIME) {
    const WIDTH = window.innerWidth;
    const HEIGHT = window.innerHeight;
    const LAYOUT = getLayout("stretch", WIDTH, HEIGHT);

    const FPS = REFRESH_RATE;
    const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;

    let pointer_x = 0.5;
    let pointer_y = 0.5;

    const frame_par = createParameter(0);
    createAnimationLoop(() => frame_par.set(frame => (frame + 1) % FRAMES));

    const initial_state = n_arr(BUFFER_LENGTH, { x: pointer_x, y: pointer_y });
    const state = engine.update(initial_state, (positions) => {
      frame_par.get();
      update(pointer_x, pointer_y, positions)
    });

    const view = engine.draw(WIDTH, HEIGHT, (ctx) => {
      const t = frame_par.get() / FRAMES;
      const positions = state.get();
      draw(ctx, t, positions, LAYOUT);
    })

    view.onmousemove = (e) => {
      const rect = view.getBoundingClientRect();
      pointer_x = e.offsetX / rect.width;
      pointer_y = e.offsetY / rect.height;
    }

    view.ontouchmove = (e) => {
      const rect = view.getBoundingClientRect();
      const touch = e.touches[0];
      pointer_x = (touch.clientX - rect.x) / rect.width;
      pointer_y = (touch.clientY - rect.y) / rect.height;
    }

    ui.createView(view);
  }
});

function update(input_x: number, input_y: number, positions: Position[]) {
  const prev_pos = positions.at(-1) || { x: input_x, y: input_y };

  const x = lerp(SMOOTHING, prev_pos.x, input_x);
  const y = lerp(SMOOTHING, prev_pos.y, input_y);

  positions.push({ x, y })
  if (positions.length > BUFFER_LENGTH) positions.shift();
}

function draw(ctx: CanvasRenderingContext2D, t: number, positions: Position[], layout: Layout) {
  const { min_size, screenX, screenY } = layout;

  for (let i = 0; i < positions.length - 1; i++) {
    const index = i;
    const next_index = i + 1;

    const f = (i + 1) / BUFFER_LENGTH;
    const radius = lerp(sinn(f + t * 2), 0.1, 1);

    const color_f = sinn(t + f)
    const r = lerp(lerp(color_f, 1, 0.5), 0, f);
    const g = lerp(lerp(color_f, 0.19, 0), 0, f);
    const b = lerp(lerp(color_f, 0, 1), 0, f);

    const a = 1;

    const getOffsetX = (i: number) => (positions[i].x - 0.5) * 2 * OFFSSET_R * -1;
    const getOffsetY = (i: number) => (positions[i].y - 0.5) * 2 * OFFSSET_R * -1;

    const pos_f = 1 - f
    const getX = (i: number) => positions[i].x + pos_f * getOffsetX(i);
    const getY = (i: number) => positions[i].y + pos_f * getOffsetY(i);

    {
      ctx.strokeStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a * 255})`;
      ctx.lineCap = "round";
      ctx.lineWidth = radius * min_size / 3;

      ctx.beginPath();
      ctx.moveTo(screenX(getX(index)), screenY(getY(index)));
      ctx.lineTo(screenX(getX(next_index)), screenY(getY(next_index)));
      ctx.stroke();
    }
  }
}