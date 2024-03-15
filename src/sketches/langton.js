import { createAnimationLoop, createParameter, createSketch } from '../rendr/rendr';
import { map, inv_cosn, cosn, inv_sinn, sinn, n_arr, mod, sin, cos, lerp, clamp, tri } from "../rendr/utils"

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 400;

const STATES_PER_FRAME = 10;
const STATES = FRAMES * STATES_PER_FRAME;

const ANTS = 2;

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

export default createSketch((render, ui) => {

   const steps_par = createParameter(200 / STATES_PER_FRAME, "steps_par");

   const width = 99;
   const height = 99;
   const initialState = {
      ants: n_arr(ANTS, (i, f, ff) => (
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

   const state_cache = render.simulate(initialState, STATES, (state, frame, _, t) => {
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
   }, { sync: false });

   const frame_cache = render.animate(WIDTH, HEIGHT, FRAMES, (ctx, { index }) => {
      const t = (0.1 + index / FRAMES) % 1;

      const lt = inv_cosn(t);

      const look_back = lerp(lt, 1 / FRAMES, 50 / FRAMES);

      const fields = n_arr(look_back * STATES, i => {
         const index = Math.floor(clamp(lt * STATES - i, 0, STATES - 1));
         return state_cache.get(index).field
      });

      const w_f = 1 / width;
      const h_f = 1 / height;
      for (let x = 0; x < width; x++) {
         for (let y = 0; y < height; y++) {

            const val = fields.reduce((tot, field, i) => tot + field[x][y], 0) / fields.length;
            if (val == 0) continue;

            const val_f = (val) / (TURNS.length - 1);
            const x_f = (x + 0.5) / width;
            const y_f = (y + 0.5) / height;
            const r_f = (1 * val_f) * w_f;

            const r = lerp(val_f, 0.5, 1);
            const g = lerp(val_f, 0, 0.5);
            const b = lerp(val_f, 1, 0);

            const color = `rgb(${r * 255}, ${g * 255}, ${b * 255})`

            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(x_f * WIDTH, y_f * HEIGHT, r_f * WIDTH, 0, Math.PI * 2);
            ctx.fill();
         }
      }
   });

   const frame_par = createParameter(0);
   createAnimationLoop(() => {
      frame_par.set(frame => (frame + 1) % FRAMES)
   });

   ui.createCacheView(frame_cache, frame_par);
});
