import rendr, { createParameter, createCache, createCanvas } from "../rendr/rendr.js";
import { Draw2dContext } from "../rendr/library/Draw2d.js";
import { map, inv_cosn, cosn, inv_sinn, sinn, n_arr, mod, sin, cos, lerp, clamp } from "../rendr/library/Utils.js"

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 500;


// const TURNS = [0.25, -0.25];

const TURNS = [0.25, -0.25, -0.25, 0.25];

// const TURNS = [0.25, 0.25, -0.25, -0.25, 0.25, 0.25];
// const TURNS = [-0.25, 0.25, 0.25, 0.25, 0.25, - 0.25];
// const TURNS = [0.25, -0.25, 0.25, 0.25, -0.25, 0.25];
// const TURNS = [-0.25, -0.25, 0.25, 0.25, -0.25, -0.25];
// const TURNS = [0.25, -0.25, -0.25, -0.25, -0.25, 0.25];
// const TURNS = [-0.25, -0.25, -0.25, 0.25, -0.25, -0.25];

// const TURNS = [0.25, 0.25, 0.25, -0.25, -0.25, 0.25, 0.25, 0.25];
// const TURNS = [0.25, -0.25, 0.25, -0.25, -0.25, 0.25, -0.25, 0.25];

// const TURNS = [-0.25, -0.25, -0.25, 0.25, 0.25, 0.25, -0.25];  // LLLRRRL
// const TURNS = [0.25, -0.25, 0.25, 0.25, 0.25, -0.25];

const sketch = rendr.createSketch(sketch => (tick_par) => {

   const steps_par = createParameter(1, "steps_par");

   const width = 99;
   const height = 99;
   const n = 2;
   const initialState = {
      ants: n_arr(n, (i, f, ff) => (
         {
            x: Math.floor(width / 2),
            y: Math.floor(height / 2),
            dir: f,
            mult: i % 2 == 0 ? -1 : 1,
            // mult: i < n / 2 ? -1 : 1,
         }
      )),
      field: n_arr(width, () => n_arr(height, null)),
   }

   const state_cache = sketch.simulate(initialState, FRAMES, (state, frame, _, t) => {
      const steps = steps_par.get();
      let { ants, field } = state;

      for (let i = 0; i < steps; i++) {

         const vals = ants.map(({ x, y }) => field[x][y] ?? 0);

         for (let j = 0; j < ants.length; j++) {
            let { x, y, dir, mult } = ants[j];
            const val = vals[j];

            field[x][y] = mod(val + 1, TURNS.length);

            const turn = TURNS[val];
            dir += turn * mult;

            x += cos(dir);
            y += sin(dir);

            x = mod(Math.round(x), width);
            y = mod(Math.round(y), height);
            ants[j] = { x, y, dir, mult }
         }
      }
      return { ants, field };
   });

   const backbuffer = createCanvas(WIDTH, HEIGHT);
   const frame_cache = sketch.animate(FRAMES, (_, t) => {
      const view = backbuffer;

      // const t = tick_par.get() / FRAMES;
      const anim_f = inv_cosn(t);
      const look_back_f = inv_sinn(t);
      const tick = Math.floor(anim_f * FRAMES);

      const look_back = lerp(anim_f, 5, 50);
      const fields = n_arr(look_back, i => state_cache.getLatest(Math.max(tick - i, 0))?.field);
      // const fields = n_arr(look_back, i => state_cache.getLatest(clamp(t < 0.5 ? tick - i : tick + i, 0, state_cache.count))?.field);

      const ctx = new Draw2dContext(view);
      ctx.clear("black");

      const w_f = 1 / width;
      const h_f = 1 / height;
      for (let x = 0; x < width; x++) {
         for (let y = 0; y < height; y++) {

            const val = fields.reduce((tot, field) => tot + field?.[x][y] ?? 0, 0) / fields.length;

            // if (fields[0][x][y] === null) continue;
            if (val == 0) continue;

            const val_f = (val) / (TURNS.length - 1);
            const x_f = (x + 0.5) / width;
            const y_f = (y + 0.5) / height;
            const r_f = (1 * val_f) * w_f;

            const r = lerp(val_f, 0.5, 1);
            const g = lerp(val_f, 0, 0.5);
            const b = lerp(val_f, 1, 0);

            const color = `rgb(${r * 255}, ${g * 255}, ${b * 255})`

            ctx.circle(x_f * WIDTH, y_f * HEIGHT, r_f * WIDTH, { beginPath: true, fill: true, fillStyle: color });
         }
      }

      return view;
   });

   return {
      state_cache,
      frame_cache,
      steps_par,
   }
});

export default rendr.createSetup("/sketches/langton.js", createUI => {

   const tick_par = createParameter(0, "tick");
   const running_par = createParameter(true, "running");

   const {
      state_cache,
      frame_cache,
      steps_par,
   } = sketch.init(tick_par);

   createUI(ui => {
      ui.createContainer(ui => {
         ui.createWindow(ui => {
            ui.createParameterNumber("steps", steps_par, { min: 1, max: 1000, step: 1 });
         });

         ui.createViewContainer(ui => {
            // ui.createView(frame_cache);
            ui.createCacheView(tick_par, running_par, frame_cache);
         });

         ui.createTimeline(FRAMES, tick_par, running_par, [
            frame_cache,
            state_cache
         ]);
      });
   })
});