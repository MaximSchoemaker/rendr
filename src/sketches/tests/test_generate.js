import { createLoop, createParameter, createSketch } from '../../rendr/rendr';
import { cosn, lerp, mod, sinn, n_arr } from '../../rendr/utils';

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 500;

const COUNT = 50_000;
const TIMEOUT = 5000;

export default createSketch((render, ui) => {

   const tick_par = createParameter(0);

   createLoop(() => {
      tick_par.set(tick => tick + 1);
   }, TIMEOUT);

   const view = render.generate(WIDTH, HEIGHT, COUNT, (ctx, { width, height, size, i, done }) => {
      tick_par.get();

      const x = Math.random();
      const y = Math.random();
      const r = 0.003;

      ctx.fillStyle = "rgb(255, 128, 0)";
      ctx.beginPath();
      ctx.arc(x * width, y * height, r * size, 0, Math.PI * 2);
      ctx.fill();

      // ctx.fillStyle = "rebeccaPurple";
      // ctx.beginPath();
      // ctx.rect(
      //    0,
      //    0,
      //    Math.ceil(width * (i / COUNT)),
      //    height * 0.05
      // );
      // ctx.fill();

      // if (Math.random() < 0.000001) done();
   });

   ui.createView(view);
});
