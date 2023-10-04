import { Draw2dContext } from "../rendr/library/Draw2d.js";
import { n_arr, mod, map, invCosn } from "../rendr/library/Utils.js"
// import SKETCH_PATH from "./sketch.js?url"

const SKETCH_PATH = "/sketches/sketch.js";
// console.log("SKETCH_PATH", SKETCH_PATH);

const ROOT_WORKER_NAME = "root"
const WORKER_NAME = self.name || ROOT_WORKER_NAME;
console.log("WORKER_NAME", WORKER_NAME);

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
      // console.log({ count });

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
      // console.log({ count, index });
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
   const state3_cache = sketch.simulate([], FRAMES, (state, frame, t) => {
      // wait(50000);
      const count = state3_count_par.get();
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
   const state4_cache = sketch.simulate([], FRAMES, (state, frame, t) => {
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

   const frame_par = null
   // const frame_par = sketch.draw(() => {
   //    const tick = tick_par.get();
   //    const t = (tick % FRAMES) / FRAMES;
   //    const state = [
   //       ...state1_par.get(),
   //       ...state2_par.get(),
   //       // ...state3_cache.getLatest(tick),
   //       // ...state4_cache.getLatest(tick),
   //       ...(state3_cache.get(tick) ?? []),
   //       ...(state4_cache.get(tick) ?? []),
   //    ];
   //    return drawScene(t, state);
   // });

   // const frame_cache = null;
   const frame_cache = sketch.animate(FRAMES, (tick, t) => {
      const state = [
         ...state1_par.get(),
         ...state2_par.get(),
         // ...state3_cache.getLatest(tick),
         // ...state4_cache.getLatest(tick),
         ...(state3_cache.get(tick) ?? []),
         ...(state4_cache.get(tick) ?? []),
      ];
      return drawScene(t, state);
   }, {
      // interval_ms: 1000
      max_queue_length: 1
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

   const gen1_frame_par = null
   // const gen1_frame_par = sketch.generate(gen1_count_par, 1000 / 60, (index) => {
   //    const tick = tick_par.get();
   //    const f = (tick % FRAMES) / FRAMES;
   //    const x = Math.random() * f;
   //    const y = Math.random() * 1;
   //    return generateScene(index, x, y);
   // });

   // const gen2_state_par = state1_par;
   const gen2_state_par = state2_par;

   const gen2_frame_par = null;
   // const gen2_frame_par = sketch.generate(gen2_state_par, 1000 / 60, (index, count, item) => {
   //    const frame = tick_par.get();
   //    const f = (frame % FRAMES) / FRAMES;
   //    const x = item.x * f;
   //    const y = item.y;
   //    return generateScene(index, x, y);
   // });

   function generateScene(index, x, y) {
      const ctx = new Draw2dContext(backbuffer);
      if (index === 0) ctx.clear("orange");
      ctx.circle(x * WIDTH, y * HEIGHT, 5, { beginPath: true, fill: true, fillStyle: "black" });
      return backbuffer;
   }

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
      frame_cache, frame_par, gen1_frame_par, gen2_frame_par,
      state3_cache_view, state4_cache_view,
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

let global_sketch_id;

let global_effect_dependencies_stack;

function global_effect_dependencies() {
   return global_effect_dependencies_stack.at(-1);
}

function Setup(createUI) {

   global_dependencies = new Map();
   global_dependency_id = 0;

   global_workers = new Set();
   global_worker_id = 0;

   global_sketch_id = 0;

   global_effect_dependencies_stack = [new Set()];

   const tick_par = createParameter(0, "tick");
   const running_par = createParameter(true, "running");
   const {
      frame_cache, frame_par, gen1_frame_par, gen2_frame_par,
      state3_cache_view, state4_cache_view,
      state1_count_par, state2_count_par, state3_count_par, gen1_count_par,
   } = test_sketch.init(tick_par);

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
         state4_cache_view,
         state3_cache_view,
      ].filter(c => !!c));
   })

   return () => {
      global_dependencies.forEach(dependency => dependency.cleanup());
      global_workers.forEach(worker => worker.terminate());
   }
}

function createSketch(fn) {

   function constructSketch(name, main_worker_name, gen_worker_name) {
      return {
         name,
         main_worker_name,
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
               gen_worker_name(),
               main_worker_name,
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
               gen_worker_name(),
               main_worker_name,
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
                     index_par.set({ index, invalidate_count: state_cache.invalidateCount(index) })
                     return
                  }
               }
            }
            requestNextIndex();

            const index_dependencies = [];
            const previous_states = [initial_state];
            const worker = createReactiveWorker(
               gen_worker_name(),
               main_worker_name,
               () => {
                  const { index, invalidate_count } = index_par.get();
                  const i = mod(index, count);
                  let state = structuredClone(previous_states[i - 1]);
                  const t = i / count;

                  const new_state = callback(state, i, t);
                  state = new_state ?? state;
                  previous_states[i] = state;

                  return { i, state, invalidate_count }
               },
               ({ i, state, invalidate_count }, dependencies_ids_and_indexes) => {

                  if (state_cache.isValid(i)) return;
                  if (state_cache.invalidateCount(i) !== invalidate_count) return

                  // if (state_cache[i] === undefined && dependencies_ids_and_indexes.length) {
                  //    state_cache[i] = dependencies_ids_and_indexes;
                  //    state_cache.invalidate(i);
                  //    requestNextIndex();
                  //    return;
                  // }

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
               gen_worker_name(),
               main_worker_name,
               state_cache,
               (index, timestamp) => {
                  const i = mod(index, count);

                  if (i === 0) {
                     previous_states[0] = structuredClone(initial_state);
                     return { i, state: previous_states[0], timestamp };
                  }

                  let state = structuredClone(previous_states[i - 1]);
                  const t = i / count;

                  const new_state = callback(state, i, t);
                  state = new_state ?? state;
                  previous_states[i] = state;

                  return state
               },
               (state, index, timestamp, dependencies_ids_and_indexes) => {

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

                  // if (index_dependencies[index] === undefined && dependencies_ids_and_indexes.length) {
                  //    index_dependencies[index] = [];
                  //    invalidate(index);
                  //    return
                  // }

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
               gen_worker_name(),
               main_worker_name,
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
               gen_worker_name(),
               main_worker_name,
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
                     const new_index = {
                        index: frame,
                        timestamp: frame_cache.invalidTimestamp(frame),
                        invalidate_count: frame_cache.invalidateCount(frame),
                     };
                     if (index_par.value?.index === new_index.index &&
                        index_par.value?.timestamp === new_index.timestamp &&
                        index_par.value?.invalidate_count === new_index.invalidate_count) {
                        return;
                     }
                     index_par.set(new_index)
                     return
                  }
               }
            }
            requestNextFrame();

            const frames_dependencies = []
            const worker = createReactiveWorker(
               gen_worker_name(),
               main_worker_name,
               () => {
                  const { index, timestamp, invalidate_count } = index_par.get();
                  const i = mod(index, frames);

                  const t = i / frames;
                  const canvas = callback(i, t);
                  const ctx = canvas.getContext('2d');
                  const bitmap = canvas.transferToImageBitmap();
                  ctx.drawImage(bitmap, 0, 0);

                  return { i, bitmap, timestamp, invalidate_count }
               },
               ({ i, bitmap, timestamp, invalidate_count }, dependencies_ids_and_indexes) => {
                  if (frame_cache.isValid(i)) return;

                  if (frame_cache.invalidTimestamp(i) !== timestamp) {
                     // frames_dependencies[i] = dependencies_ids_and_indexes;
                     frame_cache.invalidSet(i, bitmap);
                     requestNextFrame();
                     return;
                  }

                  // if (frames_dependencies[i] === undefined && dependencies_ids_and_indexes.length) {
                  //    frames_dependencies[i] = dependencies_ids_and_indexes;
                  //    frame_cache.invalidate(i);
                  //    requestNextFrame();
                  //    return;
                  // }

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
         animateQueue(frames, callback, options) {

            const frame_cache = createCache(frames);

            let start_frame = 0;
            frame_cache.onGet((index, getLatestValid) => {
               if (getLatestValid) start_frame = 0
               else start_frame = index
               // requestNextFrame();
            });

            function invalidate(index) {
               frame_cache.invalidate(index)
               const timestamp = frame_cache.invalidTimestamp(index);
               worker.postMessage({ kind: "invalidate", index, timestamp });
            }

            const frames_dependencies = []
            const worker = createReactiveCacheWorker(
               gen_worker_name(),
               main_worker_name,
               frame_cache,
               (index) => {
                  const i = mod(index, frames);

                  const t = i / frames;
                  const canvas = callback(i, t);
                  const ctx = canvas.getContext('2d');
                  const bitmap = canvas.transferToImageBitmap();
                  ctx.drawImage(bitmap, 0, 0);

                  return bitmap
               },
               (bitmap, index, timestamp, dependencies_ids_and_indexes) => {
                  // if (frame_cache.isValid(i)) return;

                  if (frame_cache.invalidTimestamp(index) !== timestamp) {
                     frame_cache.invalidSet(index, bitmap);
                     return;
                  }

                  for (let { id, index: dep_index } of dependencies_ids_and_indexes) {
                     const dependency = global_dependencies.get(id);
                     const last_set_timestamp = dependency.lastSetTimestamp(dep_index);
                     if (timestamp < last_set_timestamp) {
                        invalidate(index);
                        return;
                     }
                  }

                  // if (frames_dependencies[index] === undefined && dependencies_ids_and_indexes.length) {
                  //    frames_dependencies[index] = dependencies_ids_and_indexes;
                  //    invalidate(index);
                  //    return;
                  // }

                  frame_cache.set(index, bitmap);

                  frames_dependencies[index] = dependencies_ids_and_indexes;
               },
               (dependency_id, dependency_index) => {
                  frames_dependencies.forEach((dependencies_ids_and_indexes, frame) => {
                     if (dependencies_ids_and_indexes.find(({ id, index }) =>
                        dependency_id === id && (index === undefined || index === dependency_index)
                     )) {
                        invalidate(frame);
                     }
                  });
               },
               options
            );

            return frame_cache;
         }
      }
   }

   return {
      init(...args) {
         const name = `sketch ${global_sketch_id++}`;

         // const main_worker_name = ROOT_WORKER_NAME;
         const main_worker_name = `${name} main worker`;

         let worker_id = 0;
         const gen_worker_name = () => `${name} worker ${worker_id++}`

         const sketch = constructSketch(name, main_worker_name, gen_worker_name);

         let sketch_output = fn(sketch);
         if (typeof sketch_output === 'function')
            sketch_output = sketch_output(...args);

         // return sketch_output;

         createWorker(
            sketch.main_worker_name,
            ROOT_WORKER_NAME,
            () => {
               for (const [key, dependency] of Object.entries(sketch_output)) {
                  dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && postMessage({ id, action }));
               }
               args.forEach((dependency, index) => {
                  dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && postMessage({ id, action }));
               });
               [...global_dependencies.values()].filter(dep => dep.name).forEach((dependency) => {
                  dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && postMessage({ id, action }));
               });
            },
            (data) => {
               const { id, action } = data;
               const dependency = global_dependencies.get(id);
               dependency.mutate(action);
            },
            (worker) => {
               for (const [key, dependency] of Object.entries(sketch_output)) {
                  dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
               }
               args.forEach((dependency, index) => {
                  dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
               });
               [...global_dependencies.values()].filter(dep => dep.name).forEach((dependency) => {
                  // console.log(dependency);
                  dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
                  worker.postMessage({ id: dependency.id, action: { key: "value", value: dependency.get() } });
               });
            },
            (data) => {
               const { id, action } = data;
               const dependency = global_dependencies.get(id);
               dependency.mutate(action);
            },
         );

         return sketch_output;
      }
   }
}

function createWorker(name, parent_name, executeWorker, receiveWorker, execute, receive) {

   if (WORKER_NAME === name) {
      addEventListener("message", (evt) => receiveWorker(evt.data));

      const res = executeWorker();
      if (res !== undefined) postMessage(res);
   }
   else if (WORKER_NAME === parent_name) {
      const worker = new Worker(new URL(SKETCH_PATH, import.meta.url), { type: "module", name });
      global_workers.add(worker);

      worker.addEventListener("message", (evt) => receive(evt.data));

      const res = execute(worker);
      if (res !== undefined) worker.postMessage(res);

      return worker;
   }
}

// function createLocalStorageWorker(name, parent_name, executeWorker, receiveWorker, execute, receive) {

//    if (WORKER_NAME === name) {
//       addEventListener("message", (evt) => {
//          const { data } = evt;
//          // console.log(data);

//          const { kind, parameters } = data;
//          if (kind === "localStorage") {
//             parameters.forEach(({ id, value }) => global_dependencies.get(id).set(value));

//             const res = executeWorker();
//             if (res !== undefined) postMessage(res);

//             return;
//          }

//          receiveWorker(data)
//       });
//    }
//    else if (WORKER_NAME === parent_name) {
//       const worker = new Worker(new URL(SKETCH_PATH, import.meta.url), { type: "module", name });
//       global_workers.add(worker);

//       function start() {
//          worker.postMessage({
//             kind: "localStorage",
//             parameters: [...global_dependencies.entries()]
//                .filter(([id, p]) => p.name)
//                .map(([id, p]) => ({ id, value: p.value }))
//          })

//          const res = execute(worker);
//          if (res !== undefined) worker.postMessage(res);
//       }

//       if (WORKER_NAME === ROOT_WORKER_NAME) start()

//       addEventListener("message", (evt) => {
//          const { data } = evt;
//          const { kind, parameters } = data;

//          if (kind === "localStorage") {
//             parameters.forEach(({ id, value }) => global_dependencies.get(id).set(value));
//             start();
//          }
//       });

//       worker.addEventListener("message", (evt) => receive(evt.data));

//       return worker;
//    }
// }

function createReactiveWorker(name, parent_name, execute, receive, onDependencyChanged) {

   const worker = createWorker(
      name,
      parent_name,
      () => {
         createEffect(() => {
            const ret = execute();
            const dependencies_ids_and_indexes = [...global_effect_dependencies()]
               .map(({ dependency, index }) => ({ id: dependency.id, index }));
            if (ret !== undefined) postMessage({ value: ret, dependencies_ids_and_indexes })
         }, { batch: true });
      },
      (data) => {
         const { id, action } = data;
         const dependency = global_dependencies.get(id);
         dependency.mutate(action);
      },
      (worker) => {
         // [...global_dependencies.values()].filter(dep => dep.name).forEach((dependency) => {
         //    dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
         // });
      },
      (data) => {
         const { value, dependencies_ids_and_indexes } = data;
         receive(value, dependencies_ids_and_indexes)

         dependencies_ids_and_indexes.forEach(({ id, index }) => {
            const dep = global_dependencies.get(id);
            if (!dep.hasListener(onDepChange))
               onDepChange(dep, { key: "value", value: dep.get() });
            else
               dep.unsubscribe(onDepChange);
            dep.onChange(onDepChange);
         });
      }
   );

   function onDepChange(dependency, action) {
      const { id } = dependency;
      worker.postMessage({ id, action });
      onDependencyChanged && onDependencyChanged(dependency.id, action.index);
   }

   return worker;
}

function createReactiveQueueWorker(name, parent_name, count_or_queue, interval_ms, execute, send, receive, onDependencyChanged, options = {}) {

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

   const worker = createWorker(
      name,
      parent_name,
      () => {
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


            if (index != count) {
               clearTimeout(timeout);
               timeout = setTimeout(work);
            }
         }
      },
      (data) => {
         const { id, action } = data;
         const { value } = action;

         const dependency = global_dependencies.get(id);

         if (count_par?.id === id) {
            if (reset_on_count_change) index = 0;
            if (value <= index) index = 0;
         } else if (queue_par?.id === id) {
            if (reset_on_queue_change) index = 0;
            else if (value.length <= index) index = 0;
            else if (value.length === dependency.value.length) index = 0;
         } else {
            index = 0;
         }

         dependency.mutate(action);
         retrig_par.set(!retrig_par.value)
      },
      (worker) => {
         // [...global_dependencies.values()].filter(dep => dep.name).forEach((dependency) => {
         //    dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
         // });
      },
      (data) => {
         const { value, dependencies_ids_and_indexes } = data;
         receive(value, dependencies_ids_and_indexes)

         dependencies_ids_and_indexes.forEach(({ id, index }) => {
            const dep = global_dependencies.get(id);
            if (!dep.hasListener(onDepChange))
               onDepChange(dep, { key: "value", value: dep.get() });
            else
               dep.unsubscribe(onDepChange);
            dep.onChange(onDepChange);
         });
      },
   );

   function onDepChange(dependency, action) {
      const { id } = dependency;
      worker.postMessage({ id, action });
      onDependencyChanged && onDependencyChanged(id, action.index);
   }

   return worker;
}

function createReactiveCacheWorker(name, parent_name, cache, execute, receive, onDependencyChanged, options = {}) {
   const { interval_ms, timeout_ms, batch_timeout_ms, max_queue_length } = options;

   const retrig_par = createParameter(false);

   const worker = createWorker(
      name,
      parent_name,
      () => {
         let timeout;
         createEffect(() => {
            retrig_par.get();
            clearTimeout(timeout);
            work();
         }, {
            batch: true,
            batch_timeout_ms
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
               const { id, action } = data;

               const dependency = global_dependencies.get(id);
               dependency.mutate(action);

               retrig_par.set(!retrig_par.value)
               break;
            case "invalidate":
               const { index, timestamp } = data;
               cache.invalidate(index, timestamp);

               retrig_par.set(!retrig_par.value)
               break;
         }
      },
      (worker) => {
         // [...global_dependencies.values()].filter(dep => dep.name).forEach((dependency) => {
         //    dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
         // });
      },
      (data) => {
         const { value, index, timestamp, dependencies_ids_and_indexes } = data;
         receive(value, index, timestamp, dependencies_ids_and_indexes)

         dependencies_ids_and_indexes.forEach(({ id, index }) => {
            const dep = global_dependencies.get(id);
            if (!dep.hasListener(onDepChange))
               onDepChange(dep, { key: "value", value: dep.get() });
            else
               dep.unsubscribe(onDepChange);
            dep.onChange(onDepChange);
         });
      },
   );

   function onDepChange(dependency, action) {
      const { id } = dependency;
      worker.postMessage({ kind: "dependency", id, action });
      onDependencyChanged && onDependencyChanged(id, action.index);
   }

   return worker;
}

function isParameter(v) {
   return v.get !== undefined
      && v.set !== undefined
      && v.value !== undefined;
}

function matchActionTest(match, action) {
   if (typeof match === "object")
      return Object.entries(match).every(([key, value]) => action[key] === value);
   if (typeof match === "function")
      return match(action);
   return false;
}

function createParameter(value, name) {

   if (name && typeof localStorage !== 'undefined') {
      const stored_value = localStorage[name];
      if (stored_value) {
         const parsed_value = JSON.parse(localStorage[name])
         value = parsed_value;
      }
   }

   const ret = {
      id: global_dependency_id++,
      value,
      listeners: new Set(),
      name,
      onMutate(match, callback) {
         this.listeners.add({ match, callback });
      },
      onChange(callback) {
         // this.listeners.add(callback);
         this.onMutate({ key: "value" }, callback);
      },
      unsubscribe(callback) {
         // this.listeners = new Set([...this.listeners].filter(c => c !== callback));
         this.listeners = new Set([...this.listeners].filter(({ callback: c }) => c !== callback));
      },
      hasListener(callback) {
         // return [...this.listeners].some(c => c === callback);
         return [...this.listeners].some(l => l.callback === callback);
      },
      mutate(action) {
         action.source ??= WORKER_NAME;
         const { key, value } = action;
         if (this[key] === value) return;
         this[key] = value;

         if (key === "value") {
            this.last_set_timestamp = Date.now();
            // this.mutate({ key: "last_set_timestamp", value: Date.now() });
            if (name && typeof localStorage !== 'undefined') localStorage[name] = JSON.stringify(value);
         }

         this.listeners.forEach(({ match, callback }) => matchActionTest(match, action) && callback(this, action))
      },
      set(value) {
         this.mutate({ key: "value", value });
      },
      get() {
         global_effect_dependencies().add({ dependency: this });
         return this.value;
      },
      lastSetTimestamp() {
         return this.last_set_timestamp;
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
      onMutate(match, callback) {
         this.listeners.add({ match, callback });
      },
      onChange(callback) {
         this.onMutate({ key: "value" }, callback)
      },
      hasListener(callback) {
         return [...this.listeners].some(l => l.callback === callback);
      },
      onChangeValid(callback) {
         this.valid_listeners.add(callback);
      },
      onGet(callback) {
         this.get_listeners.add(callback);
      },
      unsubscribe(callback) {
         // this.listeners = new Set([...this.listeners].filter(c => c !== callback));
         this.listeners = new Set([...this.listeners].filter(l => l.callback !== callback));
         this.get_listeners = new Set([...this.get_listeners].filter(c => c !== callback));
         this.valid_listeners = new Set([...this.valid_listeners].filter(c => c !== callback));
      },
      mutate(action) {
         action.source ??= WORKER_NAME;
         const { key, value, index, validate } = action;
         if (index !== undefined) {

            if (this.cache[index]?.[key] === value) return;
            if (!this.cache[index]) this.cache[index] = {};

            this.cache[index][key] = value;

            if (key === "value") this.cache[index].last_set_timestamp = Date.now()
            // if (key === "value") this.mutate({ key: "last_set_timestamp", index, value: Date.now() });

            if (index > this.count)
               this.count = index;

            if (validate) this.validate(index);
         } else {
            const _key = key === "value" ? "cache" : key;
            if (this[key] === value) return
            this[key] = value;

            if (key === "value") this.last_set_timestamp = Date.now()
            // if (key === "value") this.mutate({ key: "last_set_timestamp", value: Date.now() });

         }
         this.listeners.forEach(({ match, callback }) => matchActionTest(match, action) && callback(this, action))
      },
      set(index, value) {
         if (index === undefined || value === undefined) console.warn("set, wrong arguments: index and value undefined");
         this.mutate({ key: "value", index, value });
         this.validate(index);
      },
      invalidSet(index, value) {
         if (index === undefined || value === undefined) console.warn("set, wrong arguments: index and value undefined");
         this.mutate({ key: "value", index, value });
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

         return this.getLatest(index);
      },
      isValid(index) {
         return this.cache[index]?.valid ?? false;
      },
      validate(index) {
         if (!this.cache[index]) this.cache[index] = {};
         // this.cache[index].valid = true;
         this.mutate({ key: "valid", value: true, index });
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

         this.mutate({ key: "valid", value: false, index });
         // this.mutate({ key: "invalid_timestamp", value: timestamp ?? Date.now(), index });
         // this.mutate({ key: "invalidate_count", value: (this.cache[index].invalidate_count ?? 0) + 1, index });

         // this.cache[index].valid = false;
         this.cache[index].invalid_timestamp = timestamp ?? Date.now();
         this.cache[index].invalidate_count = (this.cache[index].invalidate_count ?? 0) + 1;
      },
      invalidateFrom(index) {
         if (index === undefined) {
            this.invalidate(index);
         } else for (let i = index; i < this.count; i++)
            if (this.cache[i]) this.invalidate(i);
      },
      invalidTimestamp(index) {
         if (index === undefined) return this.invalid_timestamp;
         return this.cache[index]?.invalid_timestamp;
      },
      invalidateCount(index) {
         if (index === undefined) return this.invalidate_count;
         return this.cache[index]?.invalidate_count;
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
         this.valid_listeners.clear();
      }
   }
   global_dependencies.set(ret.id, ret);
   return ret;
}

function createEffect(callback, options = { batch: false, batch_timeout_ms: 0 }) {
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
         timeout = setTimeout(() => call(), options.batch_timeout_ms);
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


if (WORKER_NAME !== ROOT_WORKER_NAME) Setup(() => { });

export default Setup;