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

   const state = render.construct([], COUNT, (value, { done }) => {
      tick_par.get();

      value.push({ x: Math.random(), y: Math.random() });
      // value = ([...value, { x: Math.random(), y: Math.random() }]);

      // if (Math.random() < 0.0001) done();
      return value;
   }, { sync: true });

   const view = render.draw(WIDTH, HEIGHT, (ctx, { width, height, size }) => {
      const points = state.get();
      points.forEach(p => {
         const { x, y } = p;
         const r = 0.003;

         ctx.fillStyle = "orange";
         ctx.beginPath();
         ctx.arc(x * width, y * height, r * size, 0, Math.PI * 2);
         ctx.fill();
      });
   });

   ui.createView(view);
});
