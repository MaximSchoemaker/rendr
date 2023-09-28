import { Draw2dContext } from "../rendr/library/Draw2d.js";
import { n_arr, mod, map, invCosn } from "../rendr/library/Utils.js"
// import SKETCH_PATH from "./sketch.js?url"

const SKETCH_PATH = "/sketches/sketch.js";
// console.log({ SKETCH_PATH });

const WORKER_NAME = self.name;
// console.log({ WORKER_NAME });

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 200;

function wait(count) {
   let arr = [];
   for (let i = 0; i < count; i++) {
      arr.unshift(i);
   }
}

const test_sketch = createSketch(sketch => (tick_par) => {

   const backbuffer = sketch.createCanvas(WIDTH, HEIGHT);

   const state1_count_par = createParameter(0, "state1_count_par");
   const state2_count_par = createParameter(0, "state2_count_par");
   const state3_count_par = createParameter(0, "state3_count_par");
   const gen1_count_par = createParameter(1, "gen1_count_par");

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

      // return n_arr(count, () => ({
      //    x: Math.random() * t,
      //    y: map(Math.random(), 0, 1, 0 / 4, 1 / 4)
      // }));
   });

   // const state2_par = null;
   const state2_par = sketch.construct([], state2_count_par, 1000, (state, index, count, item) => {
      // wait(1000);

      // const frame = tick_par.get();
      // const f = (frame % FRAMES) / FRAMES;
      const f = 1;

      // const x = item.x * f;
      // const y = map(item.y, 0, 1 / 4, 1 / 4, 2 / 4)
      // state.push({ x, y })

      const x = Math.random() * f;
      const y = map(Math.random(), 0, 1, 1 / 4, 2 / 4)
      state.push({ x, y })
   });

   // const state3_cache = null
   const state3_cache = sketch.simulateQueue([], FRAMES, (state, frame, t) => {
      // wait(50000);
      // console.log("simulate", frame);
      const count = state3_count_par.get();
      for (let i = 0; i < count; i++) {
         const x = Math.random() * t;
         const y = map(Math.random(), 0, 1, 2 / 4, 3 / 4)
         state.push({ x, y })
      }
   }, {
      // max_queue_length: 1,
      interval_ms: 0,
      timeout_ms: 30,
   });

   // const state4_cache = null
   const state4_cache = sketch.simulate([], FRAMES, (state, frame, t) => {
      // wait(10000);

      // const index = 0;
      // const index = frame;
      const index = Math.floor(Math.random() * FRAMES);
      // const index = Math.floor(invCosn(t) * (FRAMES - 1));
      // const index = FRAMES - frame - 1;

      const state3 = state3_cache.getLatest(index);
      // const state3 = state3_cache.get(index);

      // return state3;
      // if (!state3) return
      const state3_map = state3.map(({ x, y }) => ({
         x,
         // y: map(Math.random(), 0, 1, 3 / 4, 4 / 4)
         y: map(y, 2 / 4, 3 / 4, 3 / 4, 4 / 4)
      }));
      return state3_map;
      state.push(...state3_map);
   });

   // const frame_par = null
   const frame_par = sketch.draw(() => {
      const tick = tick_par.get();
      const t = (tick % FRAMES) / FRAMES;
      const state = [
         ...state1_par.get(),
         ...state2_par.get(),
         ...state3_cache.getLatest(tick),
         ...state4_cache.getLatest(tick),
      ];
      return drawScene(t, state);
   });

   // const frame_cache = null;
   const frame_cache = sketch.animate(FRAMES, (tick, t) => {
      const state = [
         ...state1_par.get(),
         ...state2_par.get(),
         ...state3_cache.getLatest(tick),
         ...state4_cache.getLatest(tick),
      ];
      return drawScene(t, state);
   });

   function drawScene(t, state) {
      const ctx = new Draw2dContext(backbuffer);
      ctx.clear("blue");

      // const sig = Math.sin(t * Math.PI * 2) * 0.5 + 0.5
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

      return backbuffer;
   }

   // const gen1_frame_par = null
   const gen1_frame_par = sketch.generate(gen1_count_par, 1000 / 60, (index) => {
      const tick = tick_par.get();
      const f = (tick % FRAMES) / FRAMES;
      const x = Math.random() * f;
      const y = Math.random() * 1;
      return generateScene(index, x, y);
   });

   // const gen2_state_par = state1_par;
   const gen2_state_par = state2_par;

   // const gen2_frame_par = null;
   const gen2_frame_par = sketch.generate(gen2_state_par, 1000 / 60, (index, count, item) => {
      const frame = tick_par.get();
      const f = (frame % FRAMES) / FRAMES;
      const x = item.x * f;
      const y = item.y;
      return generateScene(index, x, y);
   });

   function generateScene(index, x, y) {
      const ctx = new Draw2dContext(backbuffer);
      if (index === 0) ctx.clear("orange");
      ctx.circle(x * WIDTH, y * HEIGHT, 5, { beginPath: true, fill: true, fillStyle: "black" });
      return backbuffer;
   }

   return {
      frame_cache, frame_par, gen1_frame_par, gen2_frame_par,
      state3_cache, state4_cache,
      state1_count_par, state2_count_par, state3_count_par, gen1_count_par,
   }
});



// let effectStack = [[]];
// const pushEffectStack = () => {
//    effectStack.push([]);
// }
// const popEffectStack = () => {
//    const popped = effectStack.pop();
//    popped.forEach(cleanup => cleanup());
// }
// const addEffectStack = (cleanup) => {
//    effectStack.at(-1).push(cleanup);
// }

let global_dependency_id;
let global_dependencies;

let global_worker_id;
let global_workers;

let global_effect_dependencies_stack;

function global_effect_dependencies() {
   return global_effect_dependencies_stack.at(-1);
}

function Setup(createUI) {

   global_dependencies = new Map();
   global_dependency_id = 0;

   global_workers = new Set();
   global_worker_id = 0;

   global_effect_dependencies_stack = [new Set()];

   const tick_par = createParameter(0, "tick");
   const running_par = createParameter(true, "running");
   const {
      frame_cache, frame_par, gen1_frame_par, gen2_frame_par,
      state3_cache, state4_cache,
      state1_count_par, state2_count_par, state3_count_par, gen1_count_par,
   } = test_sketch.initialize(tick_par);

   createUI(ui => {
      ui.createWindow(ui => {
         if (tick_par) ui.createParameterNumber("tick", tick_par, { min: 0, max: FRAMES - 1, step: 1 });
         if (state1_count_par) ui.createParameterNumber("State 1 Count", state1_count_par, { min: 0, max: 10000, step: 1 });
         if (state2_count_par) ui.createParameterNumber("State 2 Count", state2_count_par, { min: 0, max: 10000, step: 1 });
         if (state3_count_par) ui.createParameterNumber("State 3 Count", state3_count_par, { min: 1, max: 50, step: 1 });
         if (gen1_count_par) ui.createParameterNumber("Gen 1 Count", gen1_count_par, { min: 1, max: 100000, step: 1 });
      });

      ui.createContainer(ui => {
         if (frame_par) ui.createView(frame_par);
         if (frame_cache) ui.createCacheView(tick_par, running_par, frame_cache);
         if (gen1_frame_par) ui.createView(gen1_frame_par);
         if (gen2_frame_par) ui.createView(gen2_frame_par);
      });

      ui.createTimeline(FRAMES, tick_par, running_par, [
         frame_cache,
         state4_cache,
         state3_cache,
      ].filter(c => !!c));
   })

   return () => {
      global_dependencies.forEach(dependency => dependency.cleanup());
      global_workers.forEach(worker => worker.terminate());
   }
}

function createSketch(fn) {
   const sketch = {
      createCanvas(width, height) {
         const canvas = new OffscreenCanvas(width, height);
         return canvas;
      },
      update(initial_state, callback) {

         const initial_state_par = isParameter(initial_state) ? initial_state : createParameter(initial_state);
         const state_par = createParameter(initial_state_par.value);
         const tick_par = createParameter(0);

         let state;
         const worker = createReactiveWorker(
            () => {
               const tick = tick_par.get()
               if (tick === 0) state = structuredClone(initial_state_par.get());
               state = callback(state, tick) ?? state;
               return state;
            },
            (state) => state_par.set(state),
            (id) => {
               if (id === initial_state_par.id) tick_par.set(0)
               else if (id !== tick_par.id) tick_par.set(tick_par.value + 1);
            }
         );

         return state_par;
      },
      construct(initial_state, count_or_queue, interval_ms, callback) {

         const state_par = createParameter(initial_state);

         let state;

         const worker = createReactiveQueueWorker(
            count_or_queue,
            interval_ms,
            (index, count, item) => {
               if (count <= index) index = 0;
               if (index === 0) state = structuredClone(initial_state);

               const new_state = callback(state, index, count, item)
               state = new_state ?? state;
               return state;
            },
            (state) => state ?? initial_state,
            (state) => state_par.set(state),
         );

         return state_par;
      },
      simulate(initial_state, count, callback) {

         const index_par = createParameter({ index: 0, timestamp: undefined });
         const state_cache = createCache(count);
         state_cache.set(0, initial_state);

         let start_index = 0;

         const requestNextIndex = () => {
            for (let i = 0; i < count; i++) {
               const index = mod(start_index + i, count);
               if (!state_cache.isValid(index)) {
                  index_par.set({ index, timestamp: state_cache.invalidTimestamp(index) })
                  return
               }
            }
         }
         requestNextIndex();

         const index_dependencies = [];
         const previous_states = [initial_state];
         const worker = createReactiveWorker(
            () => {
               const { index, timestamp } = index_par.get();
               const i = mod(index, count);
               let state = structuredClone(previous_states[i - 1]);
               const t = i / count;

               const new_state = callback(state, i, t);
               state = new_state ?? state;
               previous_states[i] = state;

               return { i, state, timestamp }
            },
            ({ i, state, timestamp }, dependencies_ids_and_indexes) => {
               // console.log(state_cache.isValid(i));

               if (state_cache.isValid(i)) return;
               if (state_cache.invalidTimestamp(i) !== timestamp) return

               state_cache.set(i, state);
               // state_cache.invalidateFrom(i + 1)
               index_dependencies[i] = dependencies_ids_and_indexes;
               requestNextIndex();
            },
            (dependency_id, dependency_index) => {
               if (dependency_id === index_par.id) return;
               index_dependencies.forEach((dependencies_ids_and_indexes, index) => {
                  if (dependencies_ids_and_indexes.find(({ id, index }) =>
                     dependency_id === id && (index === undefined || index === dependency_index)
                  ))
                     // state_cache.invalidateFrom(index)
                     state_cache.invalidate(index)
               });
               requestNextIndex();
            },
         );

         return state_cache;
      },
      simulateQueue(initial_state, count, callback, options = {}) {

         const state_cache = createCache(count);
         state_cache.set(0, initial_state);

         function invalidate(index) {
            state_cache.invalidate(index)
            const timestamp = state_cache.invalidTimestamp(index);
            worker.postMessage({ kind: "invalidate", index, timestamp });
         }

         const index_dependencies = [];
         const previous_states = [initial_state];
         const worker = createReactiveCacheWorker(
            state_cache,
            (index, timestamp) => {
               const i = mod(index, count);

               if (i === 0) {
                  previous_states[0] = structuredClone(initial_state);
                  return { i, state: previous_states[0], timestamp };
               }

               let state = structuredClone(previous_states[i - 1]);
               // console.log(i, state?.length);
               const t = i / count;

               const new_state = callback(state, i, t);
               state = new_state ?? state;
               previous_states[i] = state;

               return state
            },
            (state, index, timestamp, dependencies_ids_and_indexes) => {
               // console.log(state_cache.isValid(i));
               // if (state_cache.isValid(i)) return;

               if (state_cache.invalidTimestamp(index) !== timestamp) return

               for (let { id, index: dep_index } of dependencies_ids_and_indexes) {
                  const dependency = global_dependencies.get(id);
                  const last_set_timestamp = dependency.lastSetTimestamp(dep_index);
                  if (timestamp < last_set_timestamp) {
                     index_dependencies[index] = [];
                     invalidate(index);
                     return;
                  }
               }

               if (index_dependencies[index] === undefined) {
                  index_dependencies[index] = [];
                  invalidate(index);
                  return
               }

               state_cache.set(index, state);

               index_dependencies[index] = dependencies_ids_and_indexes;
            },
            (dependency_id, dependency_index) => {
               for (let [index, dependencies_ids_and_indexes] of index_dependencies.entries()) {
                  if (!dependencies_ids_and_indexes) continue;

                  if (dependencies_ids_and_indexes.find(({ id, index }) =>
                     dependency_id === id && (index === undefined || index === dependency_index)
                  )) {
                     invalidate(index);
                  }
               }
            },
            options,
         );

         return state_cache;
      },
      draw(callback) {

         const frame_par = createParameter();

         createReactiveWorker(
            () => {
               const canvas = callback();
               const ctx = canvas.getContext('2d');
               const bitmap = canvas.transferToImageBitmap();
               ctx.drawImage(bitmap, 0, 0);
               return bitmap;
            },
            (bitmap) => frame_par.set(bitmap),
         );

         return frame_par;
      },
      generate(count_or_queue, interval_ms, callback, options) {

         const frame_par = createParameter();
         const worker = createReactiveQueueWorker(
            count_or_queue,
            interval_ms,
            (index, count, item) => callback(index, count, item),
            (canvas) => {
               if (canvas === undefined) return;
               const bitmap = canvas.transferToImageBitmap();
               const ctx = canvas.getContext('2d');
               ctx.drawImage(bitmap, 0, 0);
               return bitmap;
            },
            (bitmap) => frame_par.set(bitmap),
            undefined,
            options,
         );

         return frame_par;
      },
      animate(frames, callback) {

         const index_par = createParameter({ index: 0 });
         const frame_cache = createCache(frames);

         let start_frame = 0;
         frame_cache.onGet((index, getLatestValid) => getLatestValid
            ? start_frame = 0
            : start_frame = index
         );

         const requestNextFrame = () => {
            for (let i = 0; i < frames; i++) {
               const frame = mod(start_frame + i, frames);
               if (!frame_cache.isValid(frame)) {
                  index_par.set({ index: frame, timestamp: frame_cache.invalidTimestamp(frame) })
                  return
               }
            }
         }
         requestNextFrame();

         const frames_dependencies = []
         const worker = createReactiveWorker(
            () => {
               const { index, timestamp } = index_par.get();
               const i = mod(index, frames);

               const t = i / frames;
               const canvas = callback(i, t);
               const ctx = canvas.getContext('2d');
               const bitmap = canvas.transferToImageBitmap();
               ctx.drawImage(bitmap, 0, 0);

               return { i, bitmap, timestamp }
            },
            ({ i, bitmap, timestamp }, dependencies_ids_and_indexes) => {
               if (frame_cache.isValid(i)) return;
               if (frame_cache.invalidTimestamp(i) !== timestamp) {
                  frame_cache.invalidSet(i, bitmap);
                  return;
               }

               frame_cache.set(i, bitmap);
               frames_dependencies[i] = dependencies_ids_and_indexes;
               requestNextFrame();
            },
            (dependency_id, dependency_index) => {
               if (dependency_id === index_par.id) return;
               frames_dependencies.forEach((dependencies_ids_and_indexes, frame) => {
                  if (dependencies_ids_and_indexes.find(({ id, index }) =>
                     dependency_id === id && (index === undefined || index === dependency_index)
                  )) {
                     frame_cache.invalidate(frame)
                     // frames_dependencies[frame] = [];
                  }
               });
               requestNextFrame();
            }
         );

         return frame_cache;
      },
      // animate(frames, callback) {

      //    const queue_par = createParameter([{ index: 0 }]);
      //    const frame_cache = createCache(frames);

      //    let start_frame = 0;
      //    frame_cache.onGet((index, getLatestValid) => {
      //       if (getLatestValid) start_frame = 0
      //       else start_frame = index
      //       // requestNextFrame();
      //    });

      //    const requestNextFrame = () => {
      //       const queue = [];
      //       for (let i = 0; i < frames; i++) {
      //          const frame = mod(start_frame + i, frames);
      //          if (!frame_cache.isValid(frame)) {
      //             queue.push({
      //                index: frame,
      //                timestamp: frame_cache.invalidTimestamp(frame)
      //             })
      //          }
      //       }
      //       queue_par.set(queue);
      //    }
      //    requestNextFrame();

      //    const frames_dependencies = []
      //    const worker = createCacheWorker(
      //       queue_par,
      //       1000 / 60,
      //       (_, __, item) => {
      //          const { index, timestamp } = item;
      //          const i = mod(index, frames);

      //          const t = i / frames;
      //          const canvas = callback(i, t);
      //          const ctx = canvas.getContext('2d');
      //          const bitmap = canvas.transferToImageBitmap();
      //          ctx.drawImage(bitmap, 0, 0);

      //          return { i, bitmap, timestamp }
      //       },
      //       ({ i, bitmap, timestamp }, dependencies_ids_and_indexes) => {
      //          // if (frame_cache.isValid(i)) return;

      //          if (frame_cache.invalidTimestamp(i) !== timestamp) {
      //             frame_cache.invalidSet(i, bitmap);
      //             return;
      //          }

      //          if (frames_dependencies[i] === undefined) {
      //             // state_cache.invalidSet(i, state);
      //             frame_cache.invalidate(i);
      //             requestNextFrame();
      //          } else
      //             frame_cache.set(i, bitmap);

      //          frames_dependencies[i] = dependencies_ids_and_indexes;
      //          // requestNextFrame();
      //       },
      //       (dependency_id, dependency_index) => {
      //          if (dependency_id === queue_par.id) return;
      //          frames_dependencies.forEach((dependencies_ids_and_indexes, frame) => {
      //             if (dependencies_ids_and_indexes.find(({ id, index }) =>
      //                dependency_id === id && (index === undefined || dependency_index === undefined || index === dependency_index)
      //             )) {
      //                frame_cache.invalidate(dependency_index)
      //                // dependencies_ids_and_indexes = [];
      //             }
      //          });
      //          requestNextFrame();
      //       },
      //       { reset_on_queue_change: true }
      //    );

      //    return frame_cache;
      // }
   }

   return {
      initialize(...args) {
         const res = fn(sketch);
         if (typeof res === 'function')
            return res(...args);
         return res;
      }
   }
}

function createWorker(execute, receive) {
   const name = `worker ${global_worker_id++}`;

   if (name === WORKER_NAME) {
      const res = execute();
      if (res !== undefined) postMessage(res);
   }
   else if (WORKER_NAME === '') {
      const worker = new Worker(new URL(SKETCH_PATH, import.meta.url), { type: "module", name });
      global_workers.add(worker);
      worker.addEventListener("message", (evt) => receive(evt.data));
      return worker;
   }
}


function createMessageWorker(execute, onMessage, receive) {
   return createWorker(
      () => {
         addEventListener("message", (evt) => onMessage(evt.data));
         return execute();
      },
      receive,
   );
}

function createReactiveWorker(execute, receive, onDependencyChanged) {

   const retrig_par = createParameter(false);

   const worker = createMessageWorker(
      () => {
         createEffect(() => {
            const ret = execute();
            const dependencies_ids_and_indexes = [...global_effect_dependencies()]
               .map(({ dependency, index }) => ({ id: dependency.id, index }));
            if (ret !== undefined) postMessage({ value: ret, dependencies_ids_and_indexes })
            retrig_par.get();
         }, { batch: true });
      },
      (data) => {
         const { id, set_args } = data;
         const dependency = global_dependencies.get(id);
         dependency.set(...set_args);
         retrig_par.set(!retrig_par.get())
      },
      (data) => {
         const { value, dependencies_ids_and_indexes } = data;
         receive(value, dependencies_ids_and_indexes)

         dependencies_ids_and_indexes.forEach(({ id, index }) => {
            const dep = global_dependencies.get(id);
            if (!dep.listeners.has(onDepChange))
               onDepChange(id, dep.get());
            dep.onChange(onDepChange);
         });
      }
   );

   function onDepChange(id, ...set_args) {
      worker.postMessage({ id, set_args });
      const index = set_args.length > 1 ? set_args[0] : undefined;
      onDependencyChanged && onDependencyChanged(id, index);
   }

   return worker;
}

function createReactiveQueueWorker(count_or_queue, interval_ms, execute, send, receive, onDependencyChanged, options = {}) {

   const count_or_queue_par = isParameter(count_or_queue) ? count_or_queue : createParameter(count_or_queue);
   const { reset_on_count_change, reset_on_queue_change } = options;

   let queue_par, count_par;
   const value = count_or_queue_par.get();
   if (typeof value === 'number')
      count_par = count_or_queue_par
   else
      queue_par = count_or_queue_par

   const retrig_par = createParameter(false);

   let index = 0;

   const worker = createMessageWorker(
      () => {
         console.log({ count_par, queue_par });

         let timeout;
         createEffect(() => {
            retrig_par.get();
            clearTimeout(timeout);
            work();
         }, { batch: true });

         function work() {
            global_effect_dependencies_stack.push(new Set());
            const queue = queue_par?.get();
            const count = queue ? queue.length : count_par.get();
            if (count > 0 && index >= count) {
               global_effect_dependencies_stack.pop();
               return;
            }

            let ret;
            const time = Date.now();
            for (; index < count && Date.now() - time < interval_ms; index++) {
               const item = queue && queue[index];
               ret = execute(index, count, item);
            }
            const dependencies = global_effect_dependencies_stack.pop();
            const dependencies_ids_and_indexes = [...dependencies]
               .map(({ dependency, index }) => ({ id: dependency.id, index }));

            const value = send(ret);
            postMessage({ value, dependencies_ids_and_indexes })

            clearTimeout(timeout);
            timeout = setTimeout(work);
         }
      },
      (data) => {
         const { id, set_args } = data;

         const dependency = global_dependencies.get(id);

         if (count_par?.id === id) {
            if (reset_on_count_change) index = 0;
            if (set_args[0] <= index) index = 0;
         } else if (queue_par?.id === id) {
            if (reset_on_queue_change) index = 0;
            else if (set_args[0].length <= index) index = 0;
            else if (set_args[0].length === dependency.value.length) index = 0;
         } else {
            index = 0;
         }

         dependency.set(...set_args);
         retrig_par.set(!retrig_par.value)
      },
      (data) => {
         const { value, dependencies_ids_and_indexes } = data;
         receive(value, dependencies_ids_and_indexes)

         dependencies_ids_and_indexes.forEach(({ id, index }) => {
            const dep = global_dependencies.get(id);
            if (!dep.listeners.has(onDepChange))
               onDepChange(id, dep.get());
            dep.onChange(onDepChange);
         });
      },
   );

   function onDepChange(id, ...set_args) {
      worker.postMessage({ id, set_args });
      const index = set_args.length > 1 ? set_args[0] : undefined;
      onDependencyChanged && onDependencyChanged(id, index);
   }

   return worker;
}

function createReactiveCacheWorker(cache, execute, receive, onDependencyChanged, options = {}) {
   const { interval_ms, timeout_ms, max_queue_length } = options;

   const retrig_par = createParameter(false);

   const worker = createMessageWorker(
      () => {
         let timeout;
         createEffect(() => {
            retrig_par.get();
            clearTimeout(timeout);
            work();
         }, {
            batch: true,
            // batch_timeout: interval_ms
         });

         function work() {
            if (cache.count == 0) return;

            const time = Date.now();
            const polling = () => interval_ms === undefined || Date.now() - time <= interval_ms
            const maxQueueLength = () => max_queue_length === undefined || queue_count < max_queue_length
            let queue_count = 0;
            let index;
            for (index = 0; index < cache.count && polling() && maxQueueLength(); index++) {
               if (cache.isValid(index)) continue;
               const timestamp = cache.invalidTimestamp(index);

               global_effect_dependencies_stack.push(new Set());
               const ret = execute(index);

               const dependencies = global_effect_dependencies_stack.pop();
               const dependencies_ids_and_indexes = [...dependencies]
                  .map(({ dependency, index }) => ({ id: dependency.id, index }));

               postMessage({ value: ret, index, timestamp, dependencies_ids_and_indexes })

               cache.set(index, ret);

               queue_count++;
            }

            if (index != cache.count) {
               clearTimeout(timeout);
               timeout = setTimeout(work, timeout_ms);
            }
         }
      },
      (data) => {
         const { kind } = data;
         switch (kind) {
            case "dependency":
               const { id, set_args } = data;

               const dependency = global_dependencies.get(id);
               dependency.set(...set_args);

               retrig_par.set(!retrig_par.value)
               break;
            case "invalidate":
               const { index, timestamp } = data;
               cache.invalidate(index, timestamp);
               cache.validate(0);

               retrig_par.set(!retrig_par.value)
               break;
         }
      },
      (data) => {
         const { value, index, timestamp, dependencies_ids_and_indexes } = data;
         receive(value, index, timestamp, dependencies_ids_and_indexes)

         dependencies_ids_and_indexes.forEach(({ id, index }) => {
            const dep = global_dependencies.get(id);
            if (!dep.listeners.has(onDepChange))
               onDepChange(id, dep.get());
            dep.onChange(onDepChange);
         });
      },
   );

   function onDepChange(id, ...set_args) {
      worker.postMessage({ kind: "dependency", id, set_args });
      const index = set_args.length > 1 ? set_args[0] : undefined;
      onDependencyChanged && onDependencyChanged(id, index);
   }

   return worker;
}

function isParameter(v) {
   return v.get !== undefined
      && v.set !== undefined
      && v.value !== undefined;
}

function createParameter(value, name) {
   if (name) value = typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage[name] ?? "null") ?? value
      : value;

   const ret = {
      id: global_dependency_id++,
      value,
      listeners: new Set(),
      name,
      onChange(callback) {
         this.listeners.add(callback);
      },
      unsubscribe(callback) {
         this.listeners = new Set([...this.listeners].filter(c => c !== callback));
      },
      set(value) {
         if (this.value === value) return;
         this.value = value;
         this.last_set_timestamp = Date.now();
         this.listeners.forEach(callback => callback(this.id, value))
         if (typeof localStorage !== 'undefined' && this.name) localStorage[name] = JSON.stringify(value);
      },
      get() {
         global_effect_dependencies().add({ dependency: this });
         return this.value;
      },
      lastSetTimestamp() {
         return this.set_timestamp;
      },
      cleanup() {
         this.listeners.clear();
      }
   }
   global_dependencies.set(ret.id, ret);
   return ret;
}

function createCache(count = 0) {
   const ret = {
      id: global_dependency_id++,
      count,
      // cache: n_arr(count, () => ({ valid: false })), 
      cache: new Array(count),
      // cache: [],
      listeners: new Set(),
      valid_listeners: new Set(),
      get_listeners: new Set(),
      onChange(callback) {
         this.listeners.add(callback);
      },
      onChangeValid(callback) {
         this.valid_listeners.add(callback);
      },
      unsubscribe(callback) {
         this.listeners = new Set([...this.listeners].filter(c => c !== callback));
         this.get_listeners = new Set([...this.get_listeners].filter(c => c !== callback));
         this.valid_listeners = new Set([...this.valid_listeners].filter(c => c !== callback));
      },
      onGet(callback) {
         this.get_listeners.add(callback);
      },
      set() {
         if (arguments.length == 1) this._setAll(...arguments);
         if (arguments.length == 2) this._setIndex(...arguments);
      },
      _setAll(value) {
         if (this.cache === value) return
         this.cache = value;
         this.last_set_timestamp = Date.now();
         this.listeners.forEach(callback => callback(this.id, value))
      },
      _setIndex(index, value) {
         this.validate(index);
         this.invalidSet(index, value);
      },
      invalidSet(index, value) {
         if (this.cache[index]?.value === value) return;

         if (!this.cache[index]) this.cache[index] = {};
         this.cache[index].value = value;
         this.cache[index].last_set_timestamp = Date.now();
         if (index > this.count)
            this.count = index;

         this.listeners.forEach(callback => callback(this.id, index, value))
      },
      get() {
         if (arguments.length == 0) return this._getAll();
         if (arguments.length == 1) return this._getIndex(...arguments);
      },
      _getAll() {
         this.get_listeners.forEach(callback => callback())
         global_effect_dependencies().add({ dependency: this });
         return this.cache;
      },
      _getIndex(index) {
         this.get_listeners.forEach(callback => callback(index))
         global_effect_dependencies().add({ dependency: this, index });
         return this.cache[index]?.value;
      },
      getLatest(index = this.count - 1) {
         this.get_listeners.forEach(callback => callback(index))

         if (this.cache[index]?.value !== undefined) {
            global_effect_dependencies().add({ dependency: this, index });
            return this.cache[index].value;
         }
         global_effect_dependencies().add({ dependency: this });
         for (let i = 0; i < this.count; i++) {
            const value = this.cache[mod(index - i, this.count)]?.value;
            if (value !== undefined)
               return value;
         }

         // console.warn("no latest", this);
      },
      getLatestValid(index = this.count - 1) {
         this.get_listeners.forEach(callback => callback(index, true))

         if (this.isValid(index)) {
            global_effect_dependencies().add({ dependency: this, index });
            return this.cache[index].value;
         }
         global_effect_dependencies().add({ dependency: this });
         for (let i = 0; i < this.count; i++) {
            const item = this.cache[mod(index - i, this.count)];
            if (!item) continue;
            const { value, valid } = item;
            if (valid) return value;
         }

         // console.warn("no latest valid", this);
         return this.getLatest(index);
      },
      isValid(index) {
         return this.cache[index]?.valid ?? false;
      },
      validate(index) {
         // console.log("validate", index);
         if (!this.cache[index]) this.cache[index] = {};
         this.cache[index].valid = true;
         this.valid_listeners.forEach(callback => callback(this.id, index, true))
      },
      invalidate(index, timestamp) {
         if (index === undefined) {
            this._invalidateAll(timestamp);
            this.valid_listeners.forEach(callback => callback(this.id, false))
         } else {
            this._invalidateIndex(index, timestamp);
            this.valid_listeners.forEach(callback => callback(this.id, index, false))
         }
      },
      _invalidateAll(timestamp) {
         // for (let i = 0; i < this.count; i++) this._invalidateIndex(i);
         this.cache.forEach((_, index) => this._invalidateIndex(index, timestamp));
      },
      _invalidateIndex(index, timestamp) {
         if (!this.cache[index]) this.cache[index] = {};
         this.cache[index].valid = false;
         this.cache[index].invalid_timestamp = timestamp ?? Date.now();
      },
      invalidateFrom(index) {
         if (index === undefined) {
            this.invalidate(index);
         } else for (let i = index; i < this.count; i++)
            if (this.cache[i]) this.invalidate(i);
      },
      invalidTimestamp(index) {
         return this.cache[index]?.invalid_timestamp;
      },
      lastSetTimestamp(index) {
         if (index === undefined) return this.last_set_timestamp;
         return this.cache[index]?.last_set_timestamp;
      },
      clear(index) {
         if (index == null)
            this.cache = [];
         else
            this.cache[index] = undefined
      },
      cleanup() {
         this.listeners.clear();
         this.get_listeners.clear();
      }
   }
   global_dependencies.set(ret.id, ret);
   return ret;
}

function createEffect(callback, options = { batch: false, batch_timeout: 0 }) {
   let cleanup;
   let timeout;
   let dependencies;

   function call() {
      cleanup && cleanup();

      global_effect_dependencies_stack.push(new Set());
      const _cleanup = callback()
      dependencies = global_effect_dependencies_stack.pop()

      const callbacks = [...dependencies].map(({ dependency }) => dependency.onChange(_callback));

      cleanup = () => {
         _cleanup && _cleanup();
         dependencies.forEach(({ dependency }) => dependency.unsubscribe(_callback));
      }
   }

   function _callback() {
      if (options.batch) {
         clearTimeout(timeout);
         timeout = setTimeout(() => call(), options.batch_timeout);
      } else
         call();
   }

   call();
}


function createLoop(callback, interval = 0) {
   let timeout;
   const loop = () => {
      if (!ret.running) return
      callback();
      timeout = setTimeout(loop, interval);
   }
   const ret = {
      stop() {
         this.running = false;
         clearTimeout(timeout);
      },
      start() {
         this.running = true;
         loop();
      },
      toggle() {
         if (this.running)
            this.stop();
         else
            this.start();
      }
   }
   ret.start();
   return ret;
}


if (WORKER_NAME !== '') Setup(() => { });

export default Setup;