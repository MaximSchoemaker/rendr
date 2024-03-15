import { createAnimationLoop, createParameter, createSketch } from '../../rendr/rendr';
import { cosn, lerp, mod, sinn } from '../../rendr/utils';

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 400;

export default createSketch((render, ui) => {

   const tick_par = createParameter(0);

   createAnimationLoop(() => {
      tick_par.set(tick => tick + 1);
   });

   const view = render.draw(WIDTH, HEIGHT, (ctx, props) => {
      const { width, height, size } = props;

      const tick = tick_par.get();
      const t = mod(tick / FRAMES);

      const x = cosn(t);
      const y = lerp(sinn(t * 3), 0.4, 0.6);
      const r = 0.125;

      ctx.fillStyle = "rgb(255, 128, 0)";
      ctx.beginPath();
      ctx.arc(x * width, y * height, r * size, 0, Math.PI * 2);
      ctx.fill();
   });

   ui.createView(view);
});
