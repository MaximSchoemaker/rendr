import { resetGlobals, cleanupGlobals, createSketch, createSketchWorker, createCanvas, createParameter, createCache } from "../rendr/rendr.js";
import { Draw2dContext } from "../rendr/library/Draw2d.js";
import { n_arr, mod, map, invCosn } from "../rendr/library/Utils.js"

const ROOT_WORKER_NAME = "root"
const WORKER_NAME = self.name || ROOT_WORKER_NAME;

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 200;

function drawScene(view, t, state) {
   const ctx = new Draw2dContext(view);
   ctx.clear("blue");

   const sig = t;

   const max_count = 5000;
   const count = sig * max_count;
   // const count = frame;
   for (let i = 0; i < count; i++) {
      const f = i / (max_count);
      // const f = i / count;
      ctx.line(WIDTH * f, 0, WIDTH * f, HEIGHT, { beginPath: true, stroke: true, lineWidth: 2 });
   }

   state.forEach(({ x, y }) => {
      ctx.circle(x * WIDTH, y * HEIGHT, 2, { beginPath: true, fill: true, fillStyle: "gray" });
   });

   return view;
}

function generateScene(view, index, x, y) {
   const ctx = new Draw2dContext(view);
   if (index === 0) ctx.clear("orange");
   ctx.circle(x * WIDTH, y * HEIGHT, 5, { beginPath: true, fill: true, fillStyle: "black" });
   return view;
}


function wait(count) {
   let arr = [];
   for (let i = 0; i < count; i++) {
      arr.unshift(i);
   }
}

const data_sketch = createSketch(sketch => (tick_par) => {

   const state1_count_par = createParameter(0, "state1_count_par");
   const state2_count_par = createParameter(0, "state2_count_par");
   const state3_count_par = createParameter(0, "state3_count_par");

   // const state1_par = null;
   const state1_par = sketch.update([], (state) => {
      // wait(10000);

      const t = 1;
      const count = state1_count_par.get();
      if (state.length > count) return state.slice(0, count);
      while (state.length < count) state.push({
         x: Math.random() * t,
         y: map(Math.random(), 0, 1, 0 / 4, 1 / 4)
      });
   });

   // const state2_par = null;
   const state2_par = sketch.construct([], state2_count_par, 1000, (state, index, count, item) => {
      const f = 1;

      // const x = item.x * f;
      // const y = map(item.y, 0, 1 / 4, 1 / 4, 2 / 4)
      // state.push({ x, y })

      const x = Math.random() * f;
      const y = map(Math.random(), 0, 1, 1 / 4, 2 / 4)
      state.push({ x, y })
   });

   // const state3_cache = null
   const state3_cache = sketch.simulate([], FRAMES, (state, frame, _, t) => {
      // wait(50000);
      const count = state3_count_par.get();
      // console.log(frame, count, state);
      for (let i = 0; i < count; i++) {
         const x = Math.random() * t;
         const y = map(Math.random(), 0, 1, 2 / 4, 3 / 4)
         state.push({ x, y })
      }
   }, {
      // max_queue_length: 2,
      // interval_ms: 0,

      // batch_timeout_ms: 20,
      // timeout_ms: 20,
   });

   // const state4_cache = null
   const state4_cache = sketch.simulate([], FRAMES, (state, frame, count, t) => {
      // wait(10000);

      // const index = 0;
      // const index = frame;
      const index = Math.floor(Math.random() * FRAMES);
      // const index = Math.floor(invCosn(t) * (FRAMES - 1));
      // const index = FRAMES - frame - 1;

      const state3 = state3_cache.getLatest(index);
      // const state3 = state3_cache.get(index);
      if (!state3) return

      const state3_map = state3.map(({ x, y }) => ({
         x,
         y: map(Math.random(), 0, 1, 3 / 4, 4 / 4)
         // y: map(y, 2 / 4, 3 / 4, 3 / 4, 4 / 4)
      }));
      return state3_map;
      state.push(...state3_map);
   });

   return {
      state1_par, state2_par,
      state3_cache, state4_cache,
      state1_count_par, state2_count_par, state3_count_par,
   }
});

const draw_sketch = createSketch(sketch => (tick_par, state1_par, state2_par, state3_cache, state4_cache) => {

   const backbuffer = createCanvas(WIDTH, HEIGHT);

   // const frame_par = null
   const frame_par = sketch.draw(() => {
      const view = backbuffer;
      const tick = tick_par.get();
      const t = (tick % FRAMES) / FRAMES;
      const state = [
         ...state1_par.get(),
         ...state2_par.get(),
         // ...state3_cache.getLatest(tick),
         // ...state4_cache.getLatest(tick),
         ...(state3_cache?.get(tick) ?? []),
         ...(state4_cache?.get(tick) ?? []),
      ];
      return drawScene(view, t, state);
   });

   return {
      frame_par,
   }
});

const animate_sketch = createSketch(sketch => (tick_par, state1_par, state2_par, state3_cache, state4_cache) => {

   const backbuffer = createCanvas(WIDTH, HEIGHT);

   // const frame_cache = null;
   const frame_cache = sketch.animate(FRAMES, (tick, t) => {
      const view = backbuffer;
      const state = [
         ...state1_par.get(),
         ...state2_par.get(),
         // ...state3_cache.getLatest(tick),
         // ...state4_cache.getLatest(tick),
         ...(state3_cache?.get(tick) ?? []),
         ...(state4_cache?.get(tick) ?? []),
      ];
      return drawScene(view, t, state);
   }, {
      // interval_ms: 1000
      max_queue_length: 1
   });

   return {
      frame_cache,
   }
});

const generate_sketch1 = createSketch(sketch => (tick_par) => {

   const backbuffer = createCanvas(WIDTH, HEIGHT);
   const gen1_count_par = createParameter(0, "gen1_count_par");

   // const gen1_frame_par = null
   const gen1_frame_par = sketch.generate(gen1_count_par, 1000 / 60, (index) => {
      const view = backbuffer;
      const tick = tick_par.get();
      const f = (tick % FRAMES) / FRAMES;
      const x = Math.random() * f;
      const y = Math.random() * 1;
      return generateScene(view, index, x, y);
   });

   return {
      gen1_frame_par,
      gen1_count_par,
   }
});

const generate_sketch2 = createSketch(sketch => (tick_par, state1_par, state2_par) => {

   const backbuffer = createCanvas(WIDTH, HEIGHT);

   // const gen2_state_par = state1_par;
   const gen2_state_par = state2_par;

   // const gen2_frame_par = null;
   const gen2_frame_par = sketch.generate(gen2_state_par, 1000 / 60, (index, count, item) => {
      const view = backbuffer;
      const frame = tick_par.get();
      const f = (frame % FRAMES) / FRAMES;
      const x = item.x * f;
      const y = item.y;
      return generateScene(view, index, x, y);
   });

   return {
      gen2_frame_par,
   }
});

const master_sketch = createSketch(sketch => (tick_par) => {
   const {
      state1_par, state2_par,
      state3_cache, state4_cache,
      state1_count_par, state2_count_par, state3_count_par,
   } = data_sketch.init(tick_par);

   // const frame_par = null;
   // const frame_cache = null;
   // const gen1_frame_par = null, gen1_count_par = null;
   // const gen2_frame_par = null;

   const { frame_par } = draw_sketch.init(tick_par, state1_par, state2_par, state3_cache, state4_cache);
   const { frame_cache } = animate_sketch.init(tick_par, state1_par, state2_par, state3_cache, state4_cache);
   const { gen1_frame_par, gen1_count_par } = generate_sketch1.init(tick_par);
   const { gen2_frame_par } = generate_sketch2.init(tick_par, state1_par, state2_par);

   // let state3_cache_view = state3_cache, state4_cache_view = state4_cache;
   let state3_cache_view, state4_cache_view;
   if (state3_cache) {
      state3_cache_view = createCache(state3_cache.count);
      state3_cache_view.set(0, state3_cache.get(0));
      state3_cache.onMutate({ key: "valid" }, (dep, action) => state3_cache_view.mutate(action));
   }
   if (state4_cache) {
      state4_cache_view = createCache(state4_cache.count);
      state4_cache_view.set(0, state4_cache.get(0));
      state4_cache.onMutate({ key: "valid" }, (dep, action) => state4_cache_view.mutate(action));
   }

   return {
      state3_cache_view, state4_cache_view,
      state1_count_par, state2_count_par, state3_count_par, gen1_count_par,
      frame_par, frame_cache, gen1_frame_par, gen2_frame_par
   }
});

function Setup(createUI) {

   resetGlobals();

   const tick_par = createParameter(0, "tick");
   const running_par = createParameter(true, "running");

   for (let i = 0; i < 1; i++) {
      const {
         state3_cache_view, state4_cache_view,
         state1_count_par, state2_count_par, state3_count_par, gen1_count_par,
         frame_par, frame_cache, gen1_frame_par, gen2_frame_par
      } = master_sketch.init(tick_par);

      createUI(ui => {
         ui.createContainer(ui => {
            ui.createWindow(ui => {
               if (tick_par) ui.createParameterNumber("tick", tick_par, { min: 0, max: FRAMES - 1, step: 1 });
               if (state1_count_par) ui.createParameterNumber("State 1 Count", state1_count_par, { min: 0, max: 10000, step: 1 });
               if (state2_count_par) ui.createParameterNumber("State 2 Count", state2_count_par, { min: 0, max: 10000, step: 1 });
               if (state3_count_par) ui.createParameterNumber("State 3 Count", state3_count_par, { min: 0, max: 50, step: 1 });
               if (gen1_count_par) ui.createParameterNumber("Gen 1 Count", gen1_count_par, { min: 0, max: 100000, step: 1 });
            });

            ui.createViewContainer(ui => {
               if (frame_par) ui.createView(frame_par);
               if (frame_cache) ui.createCacheView(tick_par, running_par, frame_cache);
               if (gen1_frame_par) ui.createView(gen1_frame_par);
               if (gen2_frame_par) ui.createView(gen2_frame_par);
            });

            ui.createTimeline(FRAMES, tick_par, running_par, [
               frame_cache,
               state4_cache_view,
               state3_cache_view,
            ].filter(c => !!c));
         });
      })
   }

   return () => {
      cleanupGlobals();
   }
}


if (WORKER_NAME !== ROOT_WORKER_NAME) Setup(() => { });

export default Setup;