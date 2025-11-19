import { createAnimationLoop, createParameter, createSketch } from '../../rendr/rendr';
import { map, cosn, sinn, mod, lerp, clamp, tri, for_n, getLayout } from "../../rendr/utils"

const ANIMATION = true;
const VIDEO = true;

const GLOBAL_FRAMES = 400;
const GLOBAL_FPS = 60;
const REFRESH_RATE = 120;

export default createSketch((engine, ui) => {

   if (ANIMATION) {
      const WIDTH = 1080;
      const HEIGHT = 1080;
      const PAD = 0.15;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT, PAD);

      const FPS = REFRESH_RATE;
      const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;

      const frame_cache = engine.animate(WIDTH, HEIGHT, FRAMES, (ctx, props) => {
         const { index } = props;
         const t = (index / FRAMES) % 1;
         animation(ctx, t, LAYOUT)
      });

      const frame_par = createParameter(0);
      createAnimationLoop(() => frame_par.set(frame => (frame + 1) % FRAMES));

      ui.createCacheView(frame_cache, frame_par);
   }

   if (VIDEO) {
      const WIDTH = 1080;
      const HEIGHT = 1920;
      const PAD = 0.15;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT, PAD);

      const FPS = 60;
      const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;
      const LOOP = 2;

      const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOP, (ctx, props) => {
         const { index } = props;
         const t = (index / FRAMES) % 1;
         animation(ctx, t, LAYOUT)
      });

      ui.createVideo(video);
   }
});

const COUNT = 400;
function animation(ctx, t, layout) {
   for_n(COUNT, i => {
      const f = i / COUNT;
      const scene_t = mod(f + t * 2);
      const scene_f = sinn(f);
      scene(ctx, scene_t, scene_f, t, 500, 3, layout);
   });
   for_n(COUNT, i => {
      const f = i / COUNT;
      const scene_t = mod(f + t * 2);
      const scene_f = sinn(f);
      scene(ctx, scene_t, scene_f, t, 255, 0, layout);
   });
}

const WRAPS = 10;
function scene(ctx, t, f, global_t, color_mult, radius_offset, layout) {
   const { screenX, screenY, size } = layout;

   const x1 = sinn(t);
   const y1 = 1;

   const x2 = cosn(t);
   const y2 = 0;

   const lineWidth = 50 / 1080 * size;

   const color_f = f;
   // const color_f = tri(f);
   const g2_f = tri(f + t);
   const r = lerp(color_f, 0.5, 1);
   const g = lerp(color_f, 0, g2_f);
   const b = lerp(color_f, 1, 0);

   const getC = (v) => clamp(v * color_mult, 0, 255);
   const color = `rgb(${getC(r)}, ${getC(g)}, ${getC(b)})`

   // const count_2_t = 1;
   const count_2_t = sinn(global_t);
   const count_2 = count_2_t * WRAPS + 1;

   for (let i = 0; i < count_2; i++) {
      const f_2 = i / count_2;
      const t_f = sinn(f_2 + t + global_t);
      const x = lerp(t_f, x1, x2);
      const y = lerp(t_f, y1, y2);

      ctx.beginPath();
      ctx.arc(screenX(x), screenY(y), lineWidth / 2 + radius_offset, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
   }
}