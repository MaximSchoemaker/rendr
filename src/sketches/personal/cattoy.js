import { createLoop, createAnimationLoop, createParameter, createSketch } from "../../rendr/rendr";
import { for_n, lerp, mod, sin, cos, sinn, cosn, tri, map, getLayout } from "../../rendr/utils";

const ANIMATION = true;
const REALTIME = true;
const FRAMES = 1500;

// update
const OFFSSET_R = 1;
const SMOOTHING = 0.15;
const BUFFER_LENGTH = 200;

export default createSketch((render, ui) => {

  function update(input_x, input_y, positions) {
    const prev_pos = positions.at(-1) || { x: input_x, y: input_y };

    const x = lerp(SMOOTHING, prev_pos.x, input_x);
    const y = lerp(SMOOTHING, prev_pos.y, input_y);

    positions.push({ x, y })
    if (positions.length > BUFFER_LENGTH) positions.shift();
  }

  function draw(ctx, t, positions, layout) {
    const { size, screenX, screenY } = layout;

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

      const getOffsetX = (i) => (positions[i].x - 0.5) * 2 * OFFSSET_R * -1;
      const getOffsetY = (i) => (positions[i].y - 0.5) * 2 * OFFSSET_R * -1;

      const pos_f = 1 - f
      const getX = (i) => positions[i].x + pos_f * getOffsetX(i);
      const getY = (i) => positions[i].y + pos_f * getOffsetY(i);

      {
        ctx.strokeStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a * 255})`;
        ctx.lineCap = "round";
        ctx.lineWidth = radius * size / 3;

        ctx.beginPath();
        ctx.moveTo(screenX(getX(index)), screenY(getY(index)));
        ctx.lineTo(screenX(getX(next_index)), screenY(getY(next_index)));
        ctx.stroke();
      }
    }
  }

  // ANIMATION
  if (ANIMATION) {
    const FPS = 60;
    const WIDTH = 1080;
    const HEIGHT = 1920;
    const PAD = 0;
    const LAYOUT = getLayout("fill", WIDTH, HEIGHT, PAD);

    const frame_par = createParameter(0);
    createLoop(() => frame_par.set(frame => (frame + 1) % FRAMES), 1000 / FPS);

    function step(index, positions) {
      const t = index / FRAMES;
      const input_x = sinn(t * 8)
      const input_y = cosn(t * 10)
      return update(input_x, input_y, positions)
    }

    const initial_positions = [];
    for_n(FRAMES, i => step(i, initial_positions));

    const state = render.simulate(initial_positions, FRAMES, (positions, props) => {
      const { index } = props;
      step(index, positions);
    });

    const view_list = render.animate(WIDTH, HEIGHT, FRAMES, (ctx, props) => {
      const { index } = props;

      const t = index / FRAMES;
      const positions = state.get(index);

      draw(ctx, t, positions, LAYOUT);
    });

    ui.createCacheView(view_list, frame_par);

    const video = render.video(FPS, WIDTH, HEIGHT, FRAMES, (ctx, props) => {
      const { index } = props;

      const t = index / FRAMES;
      const positions = state.get(index);

      draw(ctx, t, positions, LAYOUT);
    });

    ui.createVideo(video);
  }

  // REALTIME
  if (REALTIME) {
    const WIDTH = window.innerWidth;
    const HEIGHT = window.innerHeight;
    const FPS = 120;
    const REALTIME_FRAMES = FRAMES * FPS / 60;
    const LAYOUT = getLayout("stretch", WIDTH, HEIGHT);

    let mouse_x = 0.5;
    let mouse_y = 0.5;

    const frame_par = createParameter(0);

    // createLoop(() => frame_par.set(frame => (frame + 1) % REALTIME_FRAMES), 1000 / FPS);
    createAnimationLoop(() => frame_par.set(frame => (frame + 1) % REALTIME_FRAMES));

    const state = render.update([], (positions) => {
      frame_par.get();
      update(mouse_x, mouse_y, positions)
    });

    const view = render.draw(WIDTH, HEIGHT, (ctx) => {
      const t = frame_par.get() / REALTIME_FRAMES;
      const positions = state.get();
      draw(ctx, t, positions, LAYOUT);
    })

    view.onmousemove = (e) => {
      const rect = view.getBoundingClientRect();
      mouse_x = e.offsetX / rect.width;
      mouse_y = e.offsetY / rect.height;
    }

    view.ontouchmove = (e) => {
      const rect = view.getBoundingClientRect();
      const touch = e.touches[0];
      mouse_x = (touch.clientX - rect.x) / rect.width;
      mouse_y = (touch.clientY - rect.y) / rect.height;
    }

    ui.createView(view);
  }
});