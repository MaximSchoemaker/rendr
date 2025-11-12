import { createAnimationLoop, createParameter, createSketch } from '../../rendr/rendr';
import { map, inv_cosn, cosn, inv_sinn, sinn, n_arr, mod, sin, cos, lerp, clamp, tri, for_n } from "../../rendr/utils"

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 400;
const LOOP = 1;

// ... record settings ...
// const SCALE = 1;
// const WIDTH = 1080 * SCALE;
// const HEIGHT = 1920 * SCALE;
// const FRAMES = 400;
// const LOOP = 2;

const SIZE = Math.min(WIDTH, HEIGHT);

export default createSketch((render, ui) => {

   const COUNT = 20;

   const frame_cache = render.animate(WIDTH, HEIGHT, FRAMES * LOOP, (ctx, props) => {
      const { width, height, index } = props;
      const t = (index / FRAMES) % 1;

      for_n(COUNT, i => {
         const f = i / COUNT;
         const scene_t = mod(f + t);
         const scene_f = sinn(f);
         scene(ctx, scene_t, scene_f);
      });
   });

   function scene(ctx, t, f) {
      const x1 = sinn(t);
      const x2 = cosn(t);

      const lw = 1; //sinn(t * 1 + f);
      const lineWidth = 50 * map(lw, 0, 1, 0.5, 1);

      const color_f = f;
      const g2_f = tri(f + t);
      const r = lerp(color_f, 0.5, 1);
      const g = lerp(color_f, 0, g2_f);
      const b = lerp(color_f, 1, 0);

      const color = `rgb(${r * 255}, ${g * 255}, ${b * 255})`
      const colorOutline = `rgb(${r * 200}, ${g * 200}, ${b * 200})`

      ctx.beginPath();
      ctx.moveTo(posX(x1), posY(1));
      ctx.lineTo(posX(x2), posY(0));

      ctx.lineCap = 'round';

      ctx.lineWidth = lineWidth + 5;
      ctx.strokeStyle = colorOutline;
      ctx.stroke();

      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.stroke();

   }

   const PAD = 0.15;
   const posX = (v) => map(v, 0, 1, PAD, 1 - PAD) * SIZE - (SIZE - WIDTH) / 2;
   const posY = (v) => map(v, 0, 1, PAD, 1 - PAD) * SIZE - (SIZE - HEIGHT) / 2;

   const frame_par = createParameter(0);
   createAnimationLoop(() => {
      frame_par.set(frame => (frame + 1) % FRAMES)
   });

   ui.createCacheView(frame_cache, frame_par);
});
