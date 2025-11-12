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
const PAD = 0.15;

const posX = (v) => map(v, 0, 1, PAD, 1 - PAD) * SIZE - (SIZE - WIDTH) / 2;
const posY = (v) => map(v, 0, 1, PAD, 1 - PAD) * SIZE - (SIZE - HEIGHT) / 2;

export default createSketch((render, ui) => {

   const COUNT = 400;

   const frame_cache = render.animate(WIDTH, HEIGHT, FRAMES * LOOP, (ctx, props) => {
      const { width, height, index } = props;
      const t = (index / FRAMES) % 1;

      // ctx.fillStyle = 'black';
      // ctx.rect(0, 0, width, height);
      // ctx.fill();

      for_n(COUNT, i => {
         const f = i / COUNT;
         const scene_t = mod(f + t * 2);
         const scene_f = sinn(f);
         scene(ctx, scene_t, scene_f, t, 500, 0, 3);
      });
      for_n(COUNT, i => {
         const f = i / COUNT;
         const scene_t = mod(f + t * 2);
         const scene_f = sinn(f);
         scene(ctx, scene_t, scene_f, t, 255, 0, 0);
      });
   });

   function scene(ctx, t, f, global_t, color_mult, color_offset, radius_offset) {
      const x1 = sinn(t);
      const y1 = 1;

      const x2 = cosn(t);
      const y2 = 0;

      const lw = 1; //sinn(t * 1 + f);
      const lineWidth = 50 * map(lw, 0, 1, 0.5, 1);

      const color_f = f;
      // const color_f = tri(f);
      const g2_f = tri(f + t);
      const r = lerp(color_f, 0.5, 1);
      const g = lerp(color_f, 0, g2_f);
      const b = lerp(color_f, 1, 0);

      const getC = (v) => clamp(v * color_mult + color_offset, 0, 255);
      const color = `rgb(${getC(r)}, ${getC(g)}, ${getC(b)})`

      const wraps = 10;
      // const count_2_t = 1;
      const count_2_t = sinn(global_t);
      const count_2 = count_2_t * wraps + 1;

      for (let i = 0; i < count_2; i++) {
         const f_2 = i / count_2;
         const t_f = sinn(f_2 + t + global_t);
         const x = lerp(t_f, x1, x2);
         const y = lerp(t_f, y1, y2);

         ctx.beginPath();
         ctx.arc(posX(x), posY(y), lineWidth / 2 + radius_offset, 0, Math.PI * 2);
         ctx.fillStyle = color;
         ctx.fill();
      }
   }

   const frame_par = createParameter(0);
   createAnimationLoop(() => {
      frame_par.set(frame => (frame + 1) % FRAMES)
   });

   ui.createCacheView(frame_cache, frame_par);
});
