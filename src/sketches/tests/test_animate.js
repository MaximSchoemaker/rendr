import { createAnimationLoop, createParameter, createSketch } from '../../rendr/rendr';
import { cosn, lerp, mod, sinn, sin } from '../../rendr/utils';

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 400;

export default createSketch((render, ui) => {

   const frame_par = createParameter(0);

   const cache = render.animate(WIDTH, HEIGHT, FRAMES, (ctx, props) => {
      // console.log(frame_par.get());
      const { width, height, size, index } = props;
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
         ctx.arc(x * width, y * height, radius * size, 0, Math.PI * 2);
         ctx.fill();
      }
   });

   createAnimationLoop(() => {
      frame_par.set(frame => (frame + 1) % FRAMES)
   });

   ui.createCacheView(cache, frame_par);
});
