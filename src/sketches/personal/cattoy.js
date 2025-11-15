import { createLoop, createAnimationLoop, createParameter, createSketch } from "../../rendr/rendr";
import { for_n, lerp, mod, sin, cos, sinn, cosn, tri, map } from "../../rendr/utils";

const FPS = 60;
const SCALE = 1;
// const WIDTH = 1080 * SCALE;
// const HEIGHT = 1920 * SCALE;
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const FRAMES = 1500 * FPS / 60;

const SIZE = Math.max(WIDTH, HEIGHT);
const PAD = 0;
const posX = (v) => map(v, 0, 1, PAD, 1 - PAD) * SIZE - (SIZE - WIDTH) / 2;
const posY = (v) => map(v, 0, 1, PAD, 1 - PAD) * SIZE - (SIZE - HEIGHT) / 2;

export default createSketch((render, ui) => {

  const OFFSSET_R = 1;
  const SMOOTHING = 0.15;
  const BUFFER_LENGTH = 200;
  function update(input_x, input_y, positions) {
    const prev_pos = positions.at(-1) || { x: input_x, y: input_y };

    const x = lerp(SMOOTHING, prev_pos.x, input_x);
    const y = lerp(SMOOTHING, prev_pos.y, input_y);

    positions.push({ x, y })
    if (positions.length > BUFFER_LENGTH) positions.shift();
  }

  function draw(ctx, t, positions, props) {
    const { width, height, size } = props;

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
        ctx.moveTo(posX(getX(index)), posY(getY(index)));
        ctx.lineTo(posX(getX(next_index)), posY(getY(next_index)));
        ctx.stroke();
      }
    }
  }

  // ANIMATION
  {
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
      draw(ctx, t, positions, props);
    });

    ui.createCacheView(view_list, frame_par);

    // const video = render.video(FPS, WIDTH, HEIGHT, FRAMES, (ctx, props) => {
    //   const { index } = props;
    //   const t = index / FRAMES;

    //   const positions = state.get(index);
    //   draw(ctx, t, positions, props);
    // });

    // ui.createVideo(video);
  }

  // REALTIME
  // {
  //   const mouse_x = createParameter(0.5);
  //   const mouse_y = createParameter(0.5);
  //   const frame_par = createParameter(0);

  //   createAnimationLoop(() => frame_par.set(frame => (frame + 1) % FRAMES));

  //   const state = render.update([], (positions) => {
  //     frame_par.get();
  //     const input_x = mouse_x.get();
  //     const input_y = mouse_y.get();

  //     update(input_x, input_y, positions)
  //   });

  //   const view = render.draw(WIDTH, HEIGHT, (ctx, props) => {
  //     const t = frame_par.get() / FRAMES;
  //     const positions = state.get();

  //     draw(ctx, t, positions, props);
  //   })

  //   view.onmousemove = (e) => {
  //     const rect = view.getBoundingClientRect();
  //     mouse_x.set(e.offsetX / rect.width);
  //     mouse_y.set(e.offsetY / rect.height);
  //   }

  //   view.ontouchmove = (e) => {
  //     const rect = view.getBoundingClientRect();
  //     const touch = e.touches[0];
  //     mouse_x.set((touch.clientX - rect.x) / rect.width);
  //     mouse_y.set((touch.clientY - rect.y) / rect.height);
  //   }

  //   ui.createView(view);
  // }
});
