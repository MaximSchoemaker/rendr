import { Draw2dContext } from "/rendr/library/Draw2d.js";
import { n_arr, mod, map, invCosn } from "/rendr/library/Utils.js"
// import SKETCH_PATH from "./sketch.js?url"

const SKETCH_PATH = "/sketches/sketch.js";
// console.log({ SKETCH_PATH });

const WORKER_NAME = self.name;
// console.log({ WORKER_NAME });

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 200;

function Sketch(tick_par) {
   const sketch = createSketch();
   const backbuffer = sketch.createCanvas(WIDTH, HEIGHT);
   const state1_count_par = createParameter(0, "state1_count_par");
   const state2_count_par = createParameter(0, "state2_count_par");

   const state1_par = sketch.update([], (state) => {
      // let arr = [];
      // for (let i = 0; i < 1000; i++) {
      //    arr.unshift(i);
      // }

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
   const state2_par = sketch.construct([], state2_count_par, (state, index, count) => {
      // let arr = [];
      // for (let i = 0; i < 1000; i++) {
      //    arr.unshift(i);
      // }

      const t = 1;
      const x = Math.random() * t;
      const y = map(Math.random(), 0, 1, 1 / 4, 2 / 4)
      state.push({ x, y })
   });

   // const state3_cache = null
   const state3_cache = sketch.simulate([], FRAMES, (state, frame, t) => {
      // let arr = [];
      // for (let i = 0; i < 50000; i++) {
      //    arr.unshift(i);
      // }

      const count = 10;
      for (let i = 0; i < count; i++) {
         const x = Math.random() * t;
         const y = map(Math.random(), 0, 1, 2 / 4, 3 / 4)
         state.push({ x, y })
      }
   });

   // const state4_cache = null
   const state4_cache = sketch.simulate([], FRAMES, (state, frame, t) => {
      // let arr = [];
      // for (let i = 0; i < 10000; i++) {
      //    arr.unshift(i);
      // }

      // const index = 0;
      // const index = frame;
      const index = Math.floor(Math.random() * FRAMES);
      // const index = Math.floor(invCosn(t) * FRAMES);

      const state3 = state3_cache.getLatest(index);
      // if (!state3) return
      const state3_map = state3.map(({ x, y }) => ({ x, y: map(Math.random(), 0, 1, 3 / 4, 4 / 4) }));
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

   // const gen_frame_par = null
   const gen_frame_par = sketch.generate(100000, (i) => {
      const t = (tick_par.get() % FRAMES) / FRAMES;
      return generateScene(i, t);
   });

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
         ctx.circle(x * WIDTH, y * HEIGHT, 1, { beginPath: true, fill: true, fillStyle: "gray" });
      });

      return backbuffer;
   }

   function generateScene(i, t) {
      const ctx = new Draw2dContext(backbuffer);
      if (i === 0) ctx.clear("orange");

      const x = Math.random() * t;
      const y = Math.random() * 1;
      ctx.circle(x * WIDTH, y * HEIGHT, 5, { beginPath: true, fill: true, fillStyle: "black" });

      return backbuffer;
   }

   return {
      frame_cache, frame_par, gen_frame_par,
      state3_cache, state4_cache,
      state1_count_par, state2_count_par
   }
}



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
      frame_cache, frame_par, gen_frame_par,
      state3_cache, state4_cache,
      state1_count_par, state2_count_par,
   } = Sketch(tick_par);

   createUI(ui => {
      ui.createWindow(ui => {
         if (tick_par) ui.createParameterNumber("tick", tick_par, { min: 0, max: FRAMES, step: 1 });
         if (state1_count_par) ui.createParameterNumber("State 1 Count", state1_count_par, { min: 0, max: 10000, step: 1 });
         if (state2_count_par) ui.createParameterNumber("State 2 Count", state2_count_par, { min: 0, max: 10000, step: 1 });
      });

      ui.createContainer(ui => {
         if (frame_par) ui.createView(frame_par);
         if (gen_frame_par) ui.createView(gen_frame_par);
         if (frame_cache) ui.createCacheView(tick_par, running_par, frame_cache);
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

function createSketch() {
   return {
      createCanvas(width, height) {
         const canvas = new OffscreenCanvas(width, height);
         return canvas;
      },
      update(initial_state, callback) {

         const state_par = createParameter(initial_state);

         const worker = createWorker(
            () => {
               state_par.value = callback(state_par.value) ?? state_par.value;
               return state_par.value;
            },
            (state) => state_par.set(state),
         );

         return state_par;
      },
      construct(initial_state, count, callback) {

         const state_par = createParameter(initial_state);
         const count_par = isParameter(count) ? count : createParameter(count);

         let timeout;
         let state
         let index = 0;

         const worker = createWorker(
            () => {
               if (count_par.value <= index) index = 0;
               if (index === 0) state = structuredClone(initial_state);

               const interval = 1000;
               function work() {
                  const time = Date.now();

                  global_effect_dependencies_stack.push(new Set());
                  const count = count_par.get();
                  while (index < count && Date.now() - time < interval) {
                     const new_state = callback(state, index, count);
                     state = new_state ?? state;
                     index++;
                  }
                  const dependencies = global_effect_dependencies_stack.pop();
                  const dependencies_ids_and_indexes = [...dependencies]
                     .map(({ dependency, index }) => ({ id: dependency.id, index }));


                  postMessage({ value: state, dependencies_ids_and_indexes });

                  if (index < count) {
                     clearTimeout(timeout);
                     timeout = setTimeout(work);
                  }
               };
               work();
            },
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
         const worker = createWorker(
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
               if (state_cache.invalidTimestamp(i) !== timestamp) {
                  state_cache.invalidSet(i, state);
                  return
               }
               state_cache.set(i, state);
               state_cache.invalidateFrom(i + 1)
               index_dependencies[i] = dependencies_ids_and_indexes;
               requestNextIndex();
            },
            (dependency_id, dependency_index) => {
               if (dependency_id === index_par.id) return;
               index_dependencies.forEach((dependencies_ids_and_indexes, index) => {
                  if (dependencies_ids_and_indexes.find(({ id, index }) =>
                     dependency_id === id && (index === undefined || index === dependency_index)
                  ))
                     state_cache.invalidateFrom(index)
               });
               requestNextIndex();
            },
         );

         return state_cache;
      },
      draw(callback) {

         const frame_par = createParameter();

         createWorker(
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
      generate(count, callback) {

         const frame_par = createParameter();
         let timeout;
         const worker = createWorker(
            () => {
               let canvas;
               let index = 0;
               const interval = 1000 / 60;
               function work() {
                  const time = Date.now();

                  global_effect_dependencies_stack.push(new Set());
                  while (index < count && Date.now() - time < interval) {
                     canvas = callback(index);
                     index++;
                  }

                  const dependencies = global_effect_dependencies_stack.pop();
                  const dependencies_ids_and_indexes = [...dependencies]
                     .map(({ dependency, index }) => ({ id: dependency.id, index }));

                  const bitmap = canvas.transferToImageBitmap();
                  postMessage({ value: bitmap, dependencies_ids_and_indexes });

                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(bitmap, 0, 0);

                  if (index < count) {
                     clearTimeout(timeout);
                     timeout = setTimeout(work);
                  }
               };
               work();
            },
            (bitmap) => frame_par.set(bitmap),
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
         const worker = createWorker(
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
                  ))
                     frame_cache.invalidate(frame)
               });
               requestNextFrame();
            }
         );

         return frame_cache;
      }
   }
}

function createWorker(execute, receive, onDependencyChanged) {
   const name = `worker ${global_worker_id++}`;

   if (name === WORKER_NAME) {
      const retrig_par = createParameter(false);
      addEventListener("message", (evt) => {
         const { data } = evt;
         const { id, set_args } = data;
         const dependency = global_dependencies.get(id);
         dependency.set(...set_args);
         retrig_par.set(!retrig_par.get())
      });

      createEffect(() => {
         const ret = execute();
         const dependencies_ids_and_indexes = [...global_effect_dependencies()]
            .map(({ dependency, index }) => ({ id: dependency.id, index }));
         if (ret !== undefined) postMessage({ value: ret, dependencies_ids_and_indexes })
         retrig_par.get();
      }, { batch: true });

   } else if (WORKER_NAME === '') {
      const worker = new Worker(new URL(SKETCH_PATH, import.meta.url), { type: "module", name });
      global_workers.add(worker);

      worker.addEventListener("message", (evt) => {
         const { data } = evt;
         const { value, dependencies_ids_and_indexes } = data;
         receive(value, dependencies_ids_and_indexes)

         dependencies_ids_and_indexes.forEach(({ id, index }) => {
            const dep = global_dependencies.get(id);
            if (!dep.listeners.has(onDepChange))
               onDepChange(id, dep.get());
            dep.onChange(onDepChange);
         });
      });

      function onDepChange(id, ...set_args) {
         worker.postMessage({ id, set_args });
         const index = set_args.length > 1 ? set_args[0] : undefined;
         onDependencyChanged && onDependencyChanged(id, index);
      }

      return worker;
   }
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
         this.listeners.forEach(callback => callback(this.id, value))
         if (typeof localStorage !== 'undefined' && this.name) localStorage[name] = JSON.stringify(value);
      },
      get() {
         global_effect_dependencies().add({ dependency: this });
         return this.value;
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
      cache: new Array(count),
      listeners: new Set(),
      get_listeners: new Set(),
      onChange(callback) {
         this.listeners.add(callback);
      },
      unsubscribe(callback) {
         this.listeners = new Set([...this.listeners].filter(c => c !== callback));
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
         if (!this.cache[index]) this.cache[index] = {};
         this.cache[index].valid = true;
      },
      invalidate(index) {
         if (!this.cache[index]) this.cache[index] = {};
         this.cache[index].valid = false;
         this.cache[index].invalid_timestamp = Date.now();
      },
      invalidTimestamp(index) {
         return this.cache[index]?.invalid_timestamp;
      },
      invalidateFrom(index) {
         for (let i = index; i < this.count; i++)
            if (this.cache[i]) this.invalidate(i);
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

function createEffect(callback, options = { batch: false }) {
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
         timeout = setTimeout(() => call());
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