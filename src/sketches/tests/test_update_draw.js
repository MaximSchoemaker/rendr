import { createLoop, createParameter, createSketch } from '../../rendr/rendr';
import { n_arr } from '../../rendr/utils';

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;

const COUNT = 50_000;
const TIMEOUT = 5000;

export default createSketch((engine, ui) => {

   const tick_par = createParameter(0);

   createLoop(() => {
      tick_par.set(tick => tick + 1);
   }, TIMEOUT);

   const state = engine.update([], () => {
      tick_par.get();
      return n_arr(COUNT, () => ({ x: Math.random(), y: Math.random() }));
   });

   const view = engine.draw(WIDTH, HEIGHT, (ctx, props) => {
      const { width, height } = props;

      const points = state.get();

      points.forEach(p => {
         const { x, y } = p;
         const r = 0.003;

         ctx.fillStyle = "rgb(255, 128, 0)"
         ctx.beginPath();
         ctx.arc(x * width, y * height, r * width, 0, Math.PI * 2);
         ctx.fill();
      });
   });

   ui.createView(view);
});
