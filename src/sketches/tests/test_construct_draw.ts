import { createLoop, createParameter, createSketch } from '../../rendr/rendr';

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 500;

const COUNT = 50_000;
const TIMEOUT = 5000;

type Points = { x: number; y: number; }[]

export default createSketch((engine, ui) => {

   const tick_par = createParameter(0);

   createLoop(() => {
      tick_par.set(tick => tick + 1);
   }, TIMEOUT);

   const state = engine.construct<Points>([], COUNT, (value, { done }) => {
      tick_par.get();

      value.push({ x: Math.random(), y: Math.random() });
      // value = ([...value, { x: Math.random(), y: Math.random() }]);

      // if (Math.random() < 0.0001) done();
      return value;
   }, { sync: true });

   const view = engine.draw(WIDTH, HEIGHT, (ctx, props) => {
      const { width, height } = props;

      const points = state.get();
      points.forEach(p => {
         const { x, y } = p;
         const r = 0.003;

         ctx.fillStyle = "rgb(255, 128, 0)";
         ctx.beginPath();
         ctx.arc(x * width, y * height, r * width, 0, Math.PI * 2);
         ctx.fill();
      });
   });

   ui.createView(view);
});
