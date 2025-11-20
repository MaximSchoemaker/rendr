import { createAnimationLoop, createParameter, createSketch } from '../../rendr/rendr';
import { cosn, lerp, mod, sinn } from '../../rendr/utils';

const SCALE = 0.055;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 100;

export default createSketch((engine, ui) => {

   const tick_par = createParameter(0);

   createAnimationLoop(() => {
      tick_par.set(tick => tick + 1);
   });

   const cols = 16;
   const rows = 16;

   ui.createGrid(cols, rows, ui => {
      for (let j = 0; j < cols; j++) {
         for (let i = 0; i < rows; i++) {

            const view = engine.draw(WIDTH, HEIGHT, (ctx, props) => {
               const { width, height } = props;

               const tick = tick_par.get();
               const f = (i + j) / (rows + cols);
               const t = mod(f + tick / FRAMES);

               const x = cosn(t);
               const y = lerp(sinn(t * 3), 0.4, 0.6);
               const r = 0.125;

               ctx.fillStyle = "rgb(255, 128, 0)";
               ctx.beginPath();
               ctx.arc(x * width, y * height, r * width, 0, Math.PI * 2);
               ctx.fill();
            });

            ui.createView(view);
         }
      }
   }, {
      flex: "0 1 1",
      height: "auto",
      "aspect-ratio": 1,
      "gap": "1%",
   });
});
