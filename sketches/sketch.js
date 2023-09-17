import { Draw2dContext } from "../rendr/library/Draw2d.ts";
import { n_arr, mod, map, invCosn } from "../rendr/library/Utils.ts"

const WORKER_NAME = self.name;
// console.log({ WORKER_NAME });

const SKETCH_PATH = "/sketches/sketch.js";

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 200;

function Sketch(tick_par) {
   const sketch = createSketch();
   const backbuffer = sketch.createCanvas(WIDTH, HEIGHT);

   const state1_par = sketch.update([], () => {
      const t = 1; //(tick_par.get() % FRAMES) / FRAMES;
      return n_arr(1000, () => ({
         x: Math.random() * t,
         y: map(Math.random(), 0, 1, 0 / 4, 1 / 4)
      }));
   });

   const state2_par = sketch.construct([], 2000, (state) => {
      const t = 1; //(tick_par.get() % FRAMES) / FRAMES;
      const x = Math.random() * t;
      const y = map(Math.random(), 0, 1, 1 / 4, 2 / 4)
      state.push({ x, y })

      // let arr = [];
      // for (let i = 0; i < 1000; i++) {
      //    arr.unshift(i);
      // }
   });

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

   const frame_par = null
   // const frame_par = sketch.draw(() => {
   //    const t = (tick_par.get() % FRAMES) / FRAMES;
   //    const tick = tick_par.get();
   //    const state = [
   //       ...state1_par.get(),
   //       ...state2_par.get(),
   //       ...state3_cache.getLatest(tick),
   //       ...state4_cache.getLatest(tick),
   //    ];
   //    return drawScene(t, state);
   // });

   const gen_frame_par = null
   // const gen_frame_par = sketch.generate(100000, (i) => {
   //    const t = (tick_par.get() % FRAMES) / FRAMES;
   //    return generateScene(i, t);
   // });

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
      // console.log("drawScene", t);
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

   return [frame_cache, frame_par, gen_frame_par, state3_cache, state4_cache];
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
   const [frame_cache, frame_par, gen_frame_par, state3_cache, state4_cache] = Sketch(tick_par);

   createUI((ui) => {
      ui.createTimeline(FRAMES, tick_par, running_par, [
         frame_cache,
         state4_cache,
         state3_cache,
      ]);
   })

   if (!WORKER_NAME) {
      const root_id = "rendr";
      const root_element = document.getElementById(root_id) ?? document.body;
      // root_element.classList.add("root");


      if (frame_cache) {
         const display1 = document.createElement("canvas");
         display1.width = WIDTH;
         display1.height = HEIGHT;
         root_element.append(display1);

         createEffect(() => {
            const ctx = display1.getContext('2d');

            const frame = tick_par.get();

            ctx.clearRect(0, 0, display1.width, display1.height);

            const c_frame = mod(frame, frame_cache.count);
            const bitmap = running_par.get()
               ? frame_cache.getLatestValid(c_frame)
               : frame_cache.getLatest(c_frame);

            if (bitmap)
               ctx.drawImage(bitmap, 0, 0);

            // {
            //    const w = display1.width / frame_cache.count + 1;
            //    const h = 10;
            //    const t = mod(frame / frame_cache.count);

            //    ctx.fillStyle = "black";
            //    ctx.beginPath();
            //    ctx.rect(0, display1.height, display1.width, - h * 3);
            //    ctx.fill();

            //    // ctx.strokeStyle = "red";
            //    // ctx.fillStyle = "red";
            //    // ctx.lineWidth = 3;
            //    // ctx.beginPath();
            //    // ctx.rect(t * display1.width, display1.height, w, - 15);
            //    // ctx.stroke();
            //    // ctx.fill();

            //    if (state3_cache) {
            //       // state3_cache.get();
            //       state3_cache.cache.forEach((el, i) => {
            //          ctx.fillStyle = ({
            //             valid: "green",
            //             pending: "white",
            //             invalid: "orange",
            //          })
            //          [state3_cache.status(i)];
            //          const f = i / frame_cache.count;
            //          ctx.beginPath();
            //          ctx.rect(f * display1.width, display1.height - 0, w, - h);
            //          ctx.fill();
            //       });
            //    }

            //    if (state4_cache) {
            //       // state4_cache.get();
            //       state4_cache.cache.forEach((el, i) => {
            //          ctx.fillStyle = ({
            //             valid: "green",
            //             pending: "white",
            //             invalid: "orange",
            //          })
            //          [state4_cache.status(i)];
            //          const f = i / frame_cache.count;
            //          ctx.beginPath();
            //          ctx.rect(f * display1.width, display1.height - h, w, - h);
            //          ctx.fill();
            //       });
            //    }

            //    frame_cache.cache.forEach((el, i) => {
            //       ctx.fillStyle = ({
            //          valid: "green",
            //          pending: "white",
            //          invalid: "orange",
            //       })
            //       [frame_cache.status(i)];
            //       const f = i / frame_cache.count;
            //       ctx.beginPath();
            //       ctx.rect(f * display1.width, display1.height - 2 * h, w, - h);
            //       ctx.fill();
            //    });

            //    ctx.strokeStyle = "red";
            //    ctx.lineWidth = 3;
            //    ctx.beginPath();
            //    ctx.rect(t * display1.width, display1.height, w, - 3 * h - ctx.lineWidth / 2);
            //    ctx.stroke();

            // }

         },
            // { batch: true }
            // true
         );
      }

      if (frame_par) {
         const display2 = document.createElement("canvas");
         display2.width = WIDTH;
         display2.height = HEIGHT;
         root_element.append(display2);

         createEffect(() => {
            const ctx = display2.getContext('2d');

            ctx.clearRect(0, 0, display2.width, display2.height);

            const bitmap = frame_par.get();
            if (bitmap)
               ctx.drawImage(bitmap, 0, 0);
         });
      }

      if (gen_frame_par) {
         const display2 = document.createElement("canvas");
         display2.width = WIDTH;
         display2.height = HEIGHT;
         root_element.append(display2);

         createEffect(() => {
            const ctx = display2.getContext('2d');

            ctx.clearRect(0, 0, display2.width, display2.height);

            const bitmap = gen_frame_par.get();
            if (bitmap)
               ctx.drawImage(bitmap, 0, 0);
         });
      }

      return () => {
         global_dependencies.forEach(dependency => dependency.cleanup());
         global_workers.forEach(worker => worker.terminate());
         root_element.innerHTML = '';
      }
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
            () => callback(),
            (state) => state_par.set(state),
         );

         return state_par;
      },
      construct(initial_state, count, callback) {

         const state_par = createParameter(initial_state);
         let timeout;
         const worker = createWorker(
            () => {
               let state = structuredClone(initial_state);
               let index = 0;
               const interval = 1000;
               function work() {
                  const time = Date.now();

                  global_effect_dependencies_stack.push(new Set());
                  while (index < count && Date.now() - time < interval) {
                     const new_state = callback(state);
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

         const index_par = createParameter(0);
         const state_cache = createCache(count);
         state_cache.set(0, initial_state);

         let start_index = 0;

         const requestNextIndex = () => {
            for (let i = 0; i < count; i++) {
               const index = mod(start_index + i, count);
               if (state_cache.status(index) !== 'valid') {
                  state_cache.pending(index);
                  index_par.set(index)
                  return
               }
            }
         }
         requestNextIndex();

         const index_dependencies = [];
         const previous_states = [initial_state];
         const worker = createWorker(
            () => {
               const i = mod(index_par.get(), count);
               let state = structuredClone(previous_states[i - 1]);
               const t = i / count;

               const new_state = callback(state, i, t);
               state = new_state ?? state;
               previous_states[i] = state;

               return { i, state }
            },
            ({ i, state }, dependencies_ids_and_indexes) => {
               const wasInvalid = state_cache.status(i) === 'invalid'
               state_cache.set(i, state);
               if (wasInvalid) state_cache.invalidate(i);

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
            // () => worker?.terminate(),
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
                  ctx.drawImage(bitmap, 0, 0); // draw bitmap back onto canvas

                  if (index < count) {
                     clearTimeout(timeout);
                     timeout = setTimeout(work);
                  }
               };
               work();
            },
            (bitmap) => frame_par.set(bitmap),
            // (id) => console.log({ id }),
         );

         return frame_par;
      },
      animate(frames, callback) {

         const index_par = createParameter(null);
         const frame_cache = createCache(frames);

         let start_frame = 0;
         frame_cache.onGet((index, getLatestValid) => getLatestValid
            ? start_frame = 0
            : start_frame = index
         );

         const requestNextFrame = () => {
            for (let i = 0; i < frames; i++) {
               const frame = mod(start_frame + i, frames);
               if (frame_cache.status(frame) !== 'valid') {
                  frame_cache.pending(frame);
                  index_par.set(frame)
                  return
               }
            }
         }
         requestNextFrame();

         const frames_dependencies = []
         const worker = createWorker(
            () => {
               const i = mod(index_par.get(), frames);

               const t = i / frames;
               const canvas = callback(i, t);
               const ctx = canvas.getContext('2d');
               const bitmap = canvas.transferToImageBitmap();
               ctx.drawImage(bitmap, 0, 0);

               return { i, bitmap }
            },
            ({ i, bitmap }, dependencies_ids_and_indexes) => {
               const wasInvalid = frame_cache.status(i) === 'invalid'
               frame_cache.set(i, bitmap);
               if (wasInvalid) frame_cache.invalidate(i);

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
         // console.log(name, "MESSAGE", data);
         const { id, set_args } = data;
         const dependency = global_dependencies.get(id);
         dependency.set(...set_args);
         retrig_par.set(!retrig_par.get())
      });

      createEffect(() => {
         const ret = execute();
         const dependencies_ids_and_indexes = [...global_effect_dependencies()]
            .map(({ dependency, index }) => ({ id: dependency.id, index }));
         if (ret) postMessage({ value: ret, dependencies_ids_and_indexes })
         retrig_par.get();
      }, { batch: true });

   } else if (WORKER_NAME === '') {
      const worker = new Worker(SKETCH_PATH, { type: "module", name });
      global_workers.add(worker);

      worker.addEventListener("message", (evt) => {
         const { data } = evt;
         const { value, dependencies_ids_and_indexes } = data;
         receive(value, dependencies_ids_and_indexes)

         dependencies_ids_and_indexes.forEach(({ id, index }) => {
            const dep = global_dependencies.get(id);
            if (!dep.listeners.has(onDepChange))
               // if (index !== undefined)
               //    onDepChange(id, index, dep.get(index));
               // else
               onDepChange(id, dep.get());
            // worker.postMessage({ id, set_args: [dep.get()] });
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
         const prev = this.value;
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
         if (this.cache[index]?.value === value) return
         this.cache[index] = { value, status: 'valid' };

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

         if (this.cache[index]?.status === 'valid') {
            global_effect_dependencies().add({ dependency: this, index });
            return this.cache[index].value;
         }
         global_effect_dependencies().add({ dependency: this });
         for (let i = 0; i < this.count; i++) {
            const item = this.cache[mod(index - i, this.count)];
            if (!item) continue;
            const { value, status } = item;
            if (status === 'valid')
               return value;
         }

         // console.warn("no latest valid", this);
         return this.getLatest(index);
      },
      status(index) {
         return this.cache[index]?.status ?? 'invalid';
      },
      clear(index) {
         if (index == null)
            this.cache = [];
         else
            this.cache[index] = undefined
      },
      invalidate(index) {
         if (index >= this.count) return;

         if (index == null) {
            this.cache.forEach(c => c.status = 'invalid');
            // this.listeners.forEach(callback => callback(this.id, this.cache))
         } else {
            if (!this.cache[index]) this.cache[index] = {};
            this.cache[index].status = 'invalid'
            // this.listeners.forEach(callback => callback(this.id, index, this.cache[index].value))
         }
      },
      invalidateFrom(index) {
         this.cache.slice(index).forEach(c => c.status = 'invalid');
      },
      pending(index) {
         this.cache.forEach(item => {
            if (item.status !== 'valid') item.status = 'invalid'
         })
         if (!this.cache[index]) this.cache[index] = {};
         this.cache[index].status = 'pending';
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
      // console.log(dependencies, dependencies);

      const callbacks = [...dependencies].map(({ dependency }) => dependency.onChange(_callback));

      cleanup = () => {
         _cleanup && _cleanup();
         dependencies.forEach(({ dependency }) => dependency.unsubscribe(_callback));
         // console.log("cleanup", dependencies);
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