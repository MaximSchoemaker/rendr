import { createAnimationLoop, createParameter, createSketch } from '../../rendr/rendr';
import { cosn, lerp, mod, sinn, sin, getLayout } from '../../rendr/utils';

const ANIMATION = true;
const VIDEO = true;

const GLOBAL_FRAMES = 400;
const GLOBAL_FPS = 60;
const REFRESH_RATE = 120;

export default createSketch((engine, ui) => {

   if (ANIMATION) {
      const WIDTH = 1080;
      const HEIGHT = 1080;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT);

      const FPS = REFRESH_RATE;
      const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;

      const cache = engine.animate(WIDTH, HEIGHT, FRAMES, (ctx, props) => {
         const { index } = props;
         const t = mod(0.75 + index / FRAMES);
         scene(ctx, t, LAYOUT)
      });

      const frame_par = createParameter(0);
      createAnimationLoop(() => frame_par.set(frame => (frame + 1) % FRAMES));
      ui.createCacheView(cache, frame_par);
   }

   if (VIDEO) {
      const WIDTH = 1080;
      const HEIGHT = 1920;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT);

      const FPS = 60;
      const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;
      const LOOP = 2;

      const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOP, (ctx, props) => {
         const { index } = props;
         const t = mod(0.75 + index / FRAMES);
         scene(ctx, t, LAYOUT)
      });
      ui.createVideo(video);
   }
});

function scene(ctx, t, layout) {
   const { screenX, screenY, size } = layout;

   const count = 1000;
   for (let i = 0; i < count; i++) {
      const f = mod(i / count);

      const x = lerp(cosn(t + f), 0.1, 0.9);
      const y = lerp(sinn((t + f) * 3) + sin(t + x), 0.4, 0.6);
      const radius = 0.05 * sinn(f);

      const color_f = sinn(t + f)
      const r = lerp(color_f, 255, 128);
      const g = lerp(color_f, 50, 0);
      const b = lerp(color_f, 0, 255);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.globalAlpha = mod(f - t)
      ctx.beginPath();
      ctx.arc(screenX(x), screenY(y), radius * size, 0, Math.PI * 2);
      ctx.fill();
   }
}