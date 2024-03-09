import { createLoop, createAnimationLoop, createParameter, createSketch } from '../../rendr/rendr';
import { cosn, lerp, mod, sinn, for_n } from '../../rendr/utils';

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 10;

const COUNT = 50_000;
const TIMEOUT = 5000;

export default createSketch((render, ui) => {

   const tick_par = createParameter(0);

   createLoop(() => {
      tick_par.set(tick => tick + 1);
   }, TIMEOUT);

   const cache = render.simulate([], FRAMES, (points, { i }) => {
      for_n(COUNT / FRAMES, () => points.push({ x: Math.random(), y: Math.random() }));
      return points;
   }, { sync: true });

   const view = render.generate(WIDTH, HEIGHT, COUNT, (ctx, props) => {
      const { width, height, size, i, done } = props;

      const tick = tick_par.get() % FRAMES;
      const points = cache.getLatest(tick);

      if (i >= points.length) return done()

      const point = points[i];

      const { x, y } = point;
      const r = 0.003;

      ctx.fillStyle = "orange"
      ctx.beginPath();
      ctx.arc(x * width, y * height, r * size, 0, Math.PI * 2);
      ctx.fill();
   });

   ui.createColumn(ui => {
      ui.createView(view);
      ui.createPerformance(render);
   });
});
