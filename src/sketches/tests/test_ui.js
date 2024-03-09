import { createAnimationLoop, createParameter, createSketch } from '../../rendr/rendr';
import { cosn, lerp, mod, sinn } from '../../rendr/utils';

const SCALE = 0.055;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 100;

export default createSketch((render, ui) => {

   const tick_par = createParameter(0);

   createAnimationLoop(() => {
      tick_par.set(tick => tick + 1);
   });

   const cols = 16;
   const rows = 16;

   ui.createColumn(ui => {
      for (let j = 0; j < cols; j++) {
         ui.createRow(ui => {
            for (let i = 0; i < rows; i++) {

               const view = render.draw(WIDTH, HEIGHT, (ctx, props) => {
                  const { width, height, size } = props;

                  const tick = tick_par.get();
                  const f = (i + j) / (rows + cols);
                  const t = mod(f + tick / FRAMES);

                  const x = cosn(t);
                  const y = lerp(sinn(t * 3), 0.4, 0.6);
                  const r = 0.125;

                  ctx.fillStyle = "orange";
                  ctx.beginPath();
                  ctx.arc(x * width, y * height, r * size, 0, Math.PI * 2);
                  ctx.fill();
               });

               ui.createView(view);
            }
         })
      }
   }, {
      "flex": "0 1 1",
      "height": "auto"
   });
});
