import { createAnimationLoop, createParameter, createSketch } from "../../rendr/rendr";
import { lerp, mod, sinn, cosn } from "../../rendr/utils";

// const SCALE = 1;
// const WIDTH = 1080 * SCALE;
// const HEIGHT = 1080 * SCALE;

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const FRAMES = 1000;
const BUFFER_LENGTH = 200;

const SMOOTHING = 0.15;
const OFFSSET_R = 1;

export default createSketch((render, ui) => {
  const frame_par = createParameter(0);
  const x_par = createParameter(0.5);
  const y_par = createParameter(0.5);

  const state = render.update({ positions: [] }, (props) => {
    let { positions } = props;

    frame_par.get();
    const mouse_x = x_par.get();
    const mouse_y = y_par.get();

    const prev_pos = positions.at(-1) || { x: mouse_x, y: mouse_y };
    const x = lerp(SMOOTHING, prev_pos.x, mouse_x);
    const y = lerp(SMOOTHING, prev_pos.y, mouse_y);

    positions.push({ x, y })
    if (positions.length > BUFFER_LENGTH) positions.shift();

    return { positions };
  });

  const view = render.draw(WIDTH, HEIGHT, (ctx, props) => {
    const { width, height, size } = props;

    const { positions } = state.get();
    const t = frame_par.get() / FRAMES;

    for (let i = 0; i < positions.length - 1; i++) {
      const index = i;
      const next_index = i + 1;

      const f = (i + 1) / BUFFER_LENGTH;
      const radius = lerp(sinn(f + t * 2), 0.1, 1);

      // const color_f = t * Math.PI / 2 + f;
      // const r = lerp(cosn(color_f + 0 / 3), 0, f);
      // const g = lerp(cosn(color_f + 1 / 3), 0, f);
      // const b = lerp(cosn(color_f + 2 / 3), 0, f);

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
        ctx.moveTo(getX(index) * width, getY(index) * height);
        ctx.lineTo(getX(next_index) * width, getY(next_index) * height);
        ctx.stroke();
      }

      // {
      //   ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a * 255})`;
      // 
      //   ctx.beginPath();
      //   ctx.arc(getX(index) * width, getY(index) * height, radius * SIZE / 6, 0, Math.PI * 2);
      //   ctx.fill();
      // }
    }
  })

  createAnimationLoop(() => frame_par.set(frame => frame + 1));

  view.onmousemove = (e) => {
    const rect = view.getBoundingClientRect();
    x_par.set(e.offsetX / rect.width);
    y_par.set(e.offsetY / rect.height);
  }

  view.ontouchmove = (e) => {
    const rect = view.getBoundingClientRect();
    const touch = e.touches[0];
    x_par.set((touch.clientX - rect.x) / rect.width);
    y_par.set((touch.clientY - rect.y) / rect.height);
  }

  ui.createView(view);
});
