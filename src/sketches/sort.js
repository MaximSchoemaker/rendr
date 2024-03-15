import rendr, { createParameter, createCache, createCanvas } from "../rendr/rendr.js";
import { Draw2dContext } from "../rendr/library/Draw2d.js";
import { map, inv_cosn, cosn, inv_sinn, sinn, n_arr, mod, sin, cos, lerp, clamp } from "../rendr/library/Utils.js"

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 300;

function getColor(color_f) {
   const r = lerp(color_f, 0.5, 1);
   const g = lerp(color_f, 0, 0.5);
   const b = lerp(color_f, 1, 0);

   // const r = lerp(color_f, 0, 1);
   // const g = lerp(color_f, 0, 1);
   // const b = lerp(color_f, 0.5, 1);

   return `rgb(${r * 255}, ${g * 255}, ${b * 255})`
}

function drawCircles(view, state_cache, count, steps) {

   const ctx = new Draw2dContext(view);
   ctx.clear("black");

   for (let j = 0; j < steps; j++) {
      const state = state_cache.get(j);
      if (state == null) break;
      const { vals } = state;

      for (let i = 0; i < count; i++) {
         const radius = 1 / count / 2;
         const x = (i + 0.5) / count;
         const y = (j + 0.5) / steps;

         const color_f = (vals[i] + 1) / count;
         const color = getColor(color_f);

         ctx.circle(x * WIDTH, y * HEIGHT, radius * WIDTH, { beginPath: true, fill: true, fillStyle: color });
      }
   };
}

function drawLines(view, state_cache, count, steps) {

   const ctx = new Draw2dContext(view);
   ctx.clear("black");

   for (let i = 0; i < count; i++) {
      for (let j = 0; j < steps; j++) {
         const state = state_cache.get(j);

         const pad_x = 0.25;
         const pad_y = 0.1;
         const lineWidth = (1 - pad_x * 2) / (count - 1);

         const color_f = (i + 1) / count;
         const color = getColor(color_f);

         if (state == null) {
            ctx.endDraw({ stroke: true, strokeStyle: color, lineWidth: lineWidth * WIDTH - 2, lineCap: "round", lineJoin: "round" });
            break;
         }
         const { vals } = state;

         const index = vals.indexOf(i);

         const x = lerp(index / (count - 1), pad_x, 1 - pad_x);
         const y = lerp(j / (steps - 1), pad_y, 1 - pad_y);

         if (j == 0)
            ctx.moveTo(x * WIDTH, y * HEIGHT, { beginPath: true });
         else
            ctx.lineTo(x * WIDTH, y * HEIGHT, { stroke: j == steps - 1, strokeStyle: color, lineWidth: lineWidth * WIDTH - 2, lineCap: "round", lineJoin: "round" });
      }
   }
}

function generateLines(view, state_cache, i, count, steps) {

   const ctx = new Draw2dContext(view);
   if (i == 0) ctx.clear("black");

   for (let j = 0; j < steps; j++) {
      const state = state_cache.get(j);

      const pad_x = 0.25;
      const pad_y = 0.1;
      const lineWidth = (1 - pad_x * 2) / (count - 1);

      const color_f = (i + 1) / count;
      const color = getColor(color_f);

      if (state == null) {
         ctx.endDraw({ stroke: true, strokeStyle: color, lineWidth: lineWidth * WIDTH - 2, lineCap: "round", lineJoin: "round" });
         return;
      }
      const { vals } = state;

      const index = vals.indexOf(i);

      const x = lerp(index / (count - 1), pad_x, 1 - pad_x);
      const y = lerp(j / (steps - 1), pad_y, 1 - pad_y);

      if (j == 0)
         ctx.moveTo(x * WIDTH, y * HEIGHT, { beginPath: true });
      else
         ctx.lineTo(x * WIDTH, y * HEIGHT, { stroke: j == steps - 1, strokeStyle: color, lineWidth: lineWidth * WIDTH - 2, lineCap: "round", lineJoin: "round" });
   }
}

const sketch = rendr.createSketch(sketch => (tick_par) => {

   const count_par = createParameter(1, "count_par");

   const state_par = sketch.update({ vals: [], steps: 0 }, () => {
      const count = count_par.get();
      const vals = n_arr(count, (i) => ({ val: i, sort: Math.random() }))
         .sort((v1, v2) => v1.sort - v2.sort)
         .map(({ val }) => val);
      return { vals, steps: 1 };
   });

   const state_cache = sketch.simulate(state_par, FRAMES, (state) => {
      // console.log("> simulate");
      // console.time("< simulate");

      const count = count_par.get();

      let { vals, steps } = state;
      for (let i = 0; i < count - 1; i++) {
         const val1 = vals[i];
         const val2 = vals[i + 1];
         if (val1 > val2) {
            vals[i] = val2
            vals[i + 1] = val1
            steps++;
            break;
         }
      }

      // console.timeEnd("< simulate");
      return { vals, steps };
   }, { interval_ms: 1 });

   const steps_par = sketch.update(0, () => {
      if (state_cache.get(FRAMES - 1) == null) return 0;
      const finalState = state_cache.getLatest(FRAMES - 1);
      if (finalState == null) return 0;
      const { steps } = finalState;
      // console.log(steps);
      return steps;
   });

   const backbuffer = createCanvas(WIDTH, HEIGHT);
   const ctx = new Draw2dContext(backbuffer);
   ctx.clear("black");

   // const frame_par = sketch.draw(() => {
   //    const view = backbuffer;
   //    const count = count_par.get();
   //    const { prev_steps, steps } = steps_par.get();

   //    if (prev_steps === steps) return view;

   //    // drawCircles(view, count, steps);
   //    drawLines(backbuffer, state_cache, count, steps);

   //    return view;
   // });

   let prev_steps = -1;
   const frame_par = sketch.generate(count_par, 1, (i, count) => {
      const view = backbuffer;
      const steps = steps_par.get();
      if (steps === 0) prev_steps = -1;
      if (prev_steps === steps) return view;
      if (i == count - 1) prev_steps = steps;

      generateLines(view, state_cache, i, count, steps);
      return view;
   });

   return {
      state_cache,
      frame_par,
      count_par,
   }
});

export default rendr.createSetup("/sketches/sort.js", createUI => {

   const tick_par = createParameter(0, "tick");
   const running_par = createParameter(true, "running");

   const {
      state_cache,
      frame_par,
      count_par,
   } = sketch.init(tick_par);

   createUI(ui => {
      ui.createContainer(ui => {
         ui.createWindow(ui => {
            ui.createParameterNumber("count", count_par, { min: 1, max: 30, step: 1 });
         });

         ui.createViewContainer(ui => {
            ui.createView(frame_par);
         });

         ui.createTimeline(FRAMES, tick_par, running_par, [
            state_cache
         ]);
      });
   })
});