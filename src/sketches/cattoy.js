import {
  createAnimationLoop,
  createParameter,
  createSketch,
} from "../rendr/rendr";
import { cosn, lerp, mod, sinn, sin } from "../rendr/utils";

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 400;
const BUFFER_LENGTH = 50;

export default createSketch((render, ui) => {
  const frame_par = createParameter(0);
  const x_par = createParameter(0);
  const y_par = createParameter(0);

  let tick = 0;
  const positions_par = render.update([], (positions) => {
    tick++;
    // frame_par.get();
    const x = x_par.get();
    const y = y_par.get();
    positions.push({ x, y })
    if (positions.length > BUFFER_LENGTH) positions.shift();
    return positions;
  });

  const view = render.draw(WIDTH, HEIGHT, (ctx, props) => {
    const { width, height } = props;

    const positions = positions_par.get();
    const t = tick / BUFFER_LENGTH;

    ctx.beginPath();
    const inital_pos = positions[0];
    if (inital_pos) ctx.moveTo(inital_pos.x * width, inital_pos.y * height);

    for (let i = 0; i < positions.length - 1; i++) {
      const pos = positions[i];
      const next_pos = positions[i + 1];

      const f = (i + 1) / BUFFER_LENGTH;
      const radius = f;

      const c = t + f;
      const r = lerp(cosn(c + 0 / 3), 0, f);
      const g = lerp(cosn(c + 1 / 3), 0, f);
      const b = lerp(cosn(c + 2 / 3), 0, f);
      const a = 1;

      ctx.strokeStyle = "red";
      ctx.lineCap = "round";

      ctx.lineWidth = radius * 150;
      ctx.strokeStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a * 255})`;

      ctx.beginPath();
      ctx.moveTo(pos.x * width, pos.y * height);
      ctx.lineTo(next_pos.x * width, next_pos.y * height);
      ctx.stroke();

      // ctx.beginPath();
      // ctx.arc(x * width, y * height, r * 50, 0, Math.PI * 2);
      // ctx.fillStyle = "red";
      // ctx.fill();
    }
  })

  createAnimationLoop(() => frame_par.set(frame => (frame + 1) % FRAMES));

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
