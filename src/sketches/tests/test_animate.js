import { createAnimationLoop, createParameter, createSketch } from '../../rendr/rendr';
import { cosn, lerp, mod, sinn, sin, getLayout } from '../../rendr/utils';

const ANIMATION = true;
const VIDEO = true;

const FRAMES = 400;

export default createSketch((render, ui) => {

   function scene(ctx, props, layout) {
      const { index } = props;
      const { screenX, screenY, size } = layout;

      const t = mod(0.75 + index / FRAMES);

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

   if (ANIMATION) {
      const WIDTH = 1080;
      const HEIGHT = 1080;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT);

      const cache = render.animate(WIDTH, HEIGHT, FRAMES, (ctx, props) =>
         scene(ctx, props, LAYOUT)
      );

      const frame_par = createParameter(0);
      createAnimationLoop(() => frame_par.set(frame => (frame + 1) % FRAMES));
      ui.createCacheView(cache, frame_par);
   }

   if (VIDEO) {
      const FPS = 60;
      const WIDTH = 1080;
      const HEIGHT = 1920;
      const LOOP = 2;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT);

      const video = render.video(FPS, WIDTH, HEIGHT, FRAMES * LOOP, (ctx, props) =>
         scene(ctx, props, LAYOUT)
      );
      ui.createVideo(video);
   }

});
