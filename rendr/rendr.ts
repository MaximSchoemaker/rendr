import { mod } from "./library/Utils.js"
// import SKETCH_PATH from "./sketch.js?url"

// const SKETCH_PATH = "/sketches/sketch.js";
// console.log("SKETCH_PATH", SKETCH_PATH);


export type onMutateCallback = (dependency: Dependency, action: Action) => void

export type Dependency = {
   id: number;
   name?: string;
   mutate: (action: Action) => void;
   get: (index?: number) => any;
   onMutate: (match: Match, callback: onMutateCallback) => void;
   onChange: (callback: onMutateCallback) => void;
   unsubscribe: (callback: onMutateCallback) => void;
   cleanup: () => void;
   hasListener: (callback: onMutateCallback) => boolean;
   setCount: (index?: number) => number | undefined;
   isValid: boolean | ((index: number) => boolean);
}

// export type Dependency = Parameter<any> | Cache<any>;

export type Action = {
   key: string;
   value: any;
   index?: number;
   validate?: boolean;
   source?: string;
   set_count?: number;
   force?: boolean;
}

export type Match = {
   key?: string;
   value?: any;
   index?: number;
   validate?: boolean;
   source?: string;
   set_count?: number;
   force?: boolean;
} | ((action: Action) => boolean);

export type StackDependency = {
   dependency: Dependency;
   index?: number;
}

const ROOT_WORKER_NAME = "root"
const WORKER_NAME = self.name || ROOT_WORKER_NAME;
console.log("WORKER_NAME", WORKER_NAME);

let global_sketch_path: string;
let global_dependency_id = 0;
let global_dependencies = new Map<number, Dependency>();
let global_workers = new Set<Worker>();
let global_sketch_id = 0;
let global_effect_dependencies_stack = [new Set<StackDependency>()];

function global_effect_dependencies() {
   return global_effect_dependencies_stack.at(-1);
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


export function resetGlobals(sketch_path: string) {
   global_sketch_path = sketch_path;
   global_dependencies = new Map();
   global_dependency_id = 0;
   global_workers = new Set();
   global_sketch_id = 0;
   global_effect_dependencies_stack = [new Set()];
}


export function createEffect(
   callback: () => (void | (() => void)),
   options: { batch?: boolean, batch_timeout_ms?: number } = { batch: false, batch_timeout_ms: 0 }
) {
   let cleanup: () => void;
   let timeout: number;
   let dependencies: Set<StackDependency>;

   function call() {
      cleanup && cleanup();

      global_effect_dependencies_stack.push(new Set());
      const _cleanup = callback()
      dependencies = global_effect_dependencies_stack.pop() ?? new Set<StackDependency>();

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

export function createCanvas(width: number, height: number) {
   const canvas = new OffscreenCanvas(width, height);
   return canvas;
}


export function isParameter(v: any) {
   return v.get !== undefined
      && v.set !== undefined
      && v.value !== undefined;
}

export function matchActionTest(match: Match, action: Action) {
   if (typeof match === "object") // @ts-ignore
      return Object.entries(match).every(([key, value]) => action[key] === value);
   if (typeof match === "function")
      return match(action);
   return false;
}

// export type Parameter<T> = ReturnType<typeof createParameter<T>>;
export type Parameter<T> = Omit<Dependency, 'get'> & {
   value: T;
   set: (value: T, force?: boolean) => void;
   get: () => T;
}

type ListenerRecord = { match: Match, callback: onMutateCallback }

export function createParameter<T>(initial_value: T, name?: string): Parameter<T> {

   if (name && typeof localStorage !== 'undefined') {
      const stored_value = localStorage[name];
      if (stored_value) {
         const parsed_value = JSON.parse(localStorage[name])
         initial_value = parsed_value;
      }
   }

   const id = global_dependency_id++;
   let listeners = new Set<ListenerRecord>();
   let set_counter = 0;

   function onMutate(match: Match, callback: onMutateCallback) {
      listeners.add({ match, callback });
   }

   function onChange(callback: onMutateCallback) {
      onMutate({ key: "value" }, callback);
   }

   function unsubscribe(callback: onMutateCallback) {
      listeners = new Set([...listeners].filter(({ callback: c }) => c !== callback));
   }

   function hasListener(callback: onMutateCallback) {
      return [...listeners].some(l => l.callback === callback);
   }

   function mutate(action: Action) {
      action.source ??= WORKER_NAME;
      const { key, value, set_count, force } = action; // @ts-ignore
      if (!force && parameter[key] === value) return; // @ts-ignore
      parameter[key] = value;

      if (key === "value") {
         set_counter = set_count ?? set_counter + 1;
         action.set_count = set_counter;
         // mutate({ key: "set_counter", value: set_counter });
         if (name && typeof localStorage !== 'undefined') localStorage[name] = JSON.stringify(value);
      }
      listeners.forEach(({ match, callback }) => matchActionTest(match, action) && callback(parameter, action))
   }

   function set(value: T, force?: boolean) {
      mutate({ key: "value", value, force });
   }

   function get() {
      global_effect_dependencies()?.add({ dependency: parameter });
      return parameter.value;
   }

   function setCount() {
      return set_counter;
   }

   function cleanup() {
      listeners.clear();
   }

   const parameter = {
      id,
      value: initial_value,
      listeners,
      name,
      set_counter,
      onMutate,
      onChange,
      unsubscribe,
      hasListener,
      mutate,
      set,
      get,
      setCount,
      cleanup,
   }

   global_dependencies.set(parameter.id, parameter);

   return parameter;
}

// export type Cache<T> = ReturnType<typeof createCache<T>>;
export type Cache<T> = Omit<Dependency, 'get'> & {
   value: CacheItem<T>[]
   count: number,
   get: (() => CacheItem<T>[]) & ((index: number) => T),
   getLatest: (index: number) => T | undefined,
   getLatestValid: (index: number) => T | undefined,
   set: (index: number, value: T, force?: boolean) => void,
   invalidSet: (index: number, value: T, force?: boolean) => void,
   invalidate: (index: number, invalidate_count?: number) => void,
   isValid: (index: number) => boolean,
   invalidateCount: (index: number) => number | undefined,
   // onGet: (callback: onGetCallback) => void,
   request: (index: number) => void,
   requestIndex: () => number,
}

type onGetCallback = (index?: number, valid?: boolean) => void
type CacheItem<T> = {
   value?: T,
   valid?: boolean,
   set_counter?: number,
   invalidate_count?: number,
}

export function createCache<T>(count = 0): Cache<T> {

   const id = global_dependency_id++;

   let listeners = new Set<ListenerRecord>();
   let set_counter = 0;

   function onMutate(match: Match, callback: onMutateCallback) {
      listeners.add({ match, callback });
   }

   function onChange(callback: onMutateCallback) {
      onMutate({ key: "value" }, callback)
   }

   function hasListener(callback: onMutateCallback) {
      return [...listeners].some(l => l.callback === callback);
   }

   function unsubscribe(callback: onMutateCallback | onGetCallback) {
      listeners = new Set([...listeners].filter(l => l.callback !== callback));
   }

   function mutate(action: Action) {
      action.source ??= WORKER_NAME;
      const { key, value, index, set_count, force } = action;
      if (index !== undefined) {
         // @ts-ignore
         if (!force && cache.value[index]?.[key] === value) return;
         if (!cache.value[index]) cache.value[index] = {};
         // @ts-ignore
         cache.value[index][key] = value;

         if (key === "value") {
            cache.value[index].set_counter = set_count ?? (cache.value[index].set_counter ?? 0) + 1;
            // mutate({ key: "set_counter", index, value: Date.now() });
            action.set_count = cache.value[index].set_counter;
         }

         if (index > count)
            count = index;

         if (action.validate) validate(index);
      } else {
         // @ts-ignore
         if (!force && cache[key] === value) return

         if (value == null) {
            clear(); // @ts-ignore
         } else cache[key] = value;

         if (key === "value") {
            set_counter = set_count ?? set_counter + 1;
            mutate({ key: "set_counter", value: Date.now() });
            action.set_count = set_counter;
         }

      }
      listeners.forEach(({ match, callback }) => matchActionTest(match, action) && callback(cache, action))
   }

   function set(index: number, value: T, force?: boolean) {
      // if (index === undefined || value === undefined) console.warn("set, wrong arguments: index and value undefined");
      mutate({ key: "value", index, value, force });
      validate(index);
   }

   function invalidSet(index: number, value: T, force?: boolean) {
      // if (index === undefined || value === undefined) console.warn("set, wrong arguments: index and value undefined");
      mutate({ key: "value", index, value, force });
   }

   function get(): CacheItem<T>[];
   function get(index: number): T;
   function get(...args: ([] | [number])) {
      if (args.length == 0) return _getAll();
      if (args.length == 1) return _getIndex(...args);
   }

   function _getAll() {
      global_effect_dependencies()?.add({ dependency: cache });
      return cache.value;
   }

   function _getIndex(index: number) {
      global_effect_dependencies()?.add({ dependency: cache, index });
      return cache.value[index]?.value;
   }

   function getLatest(index = count - 1) {
      if (cache.value[index]?.value !== undefined) {
         global_effect_dependencies()?.add({ dependency: cache, index });
         return cache.value[index].value;
      }
      global_effect_dependencies()?.add({ dependency: cache });
      for (let i = index; i >= 0; i--) {
         const value = cache.value[i]?.value;
         if (value !== undefined)
            return value;
      }
   }

   function getLatestValid(index = count - 1) {
      if (isValid(index)) {
         global_effect_dependencies()?.add({ dependency: cache, index });
         return cache.value[index].value;
      }
      global_effect_dependencies()?.add({ dependency: cache });
      for (let i = index; i >= 0; i--) {
         const item = cache.value[i];
         if (!item) continue;
         const { value, valid } = item;
         if (valid) return value;
      }

      // return getLatest(index);
   }
   function isValid(index: number) {
      return cache.value[index]?.valid ?? false;
   }

   function validate(index: number) {
      if (!cache.value[index]) cache.value[index] = {};
      mutate({ key: "valid", value: true, index });
   }

   function invalidate(index: number, invalidate_count?: number) {
      if (index === undefined) {
         _invalidateAll(invalidate_count);
      } else {
         _invalidateIndex(index, invalidate_count);
      }
   }

   function _invalidateAll(invalidate_count?: number) {
      // for (let i = 0; i < count; i++) _invalidateIndex(i);
      cache.value.forEach((_, index) => _invalidateIndex(index, invalidate_count));
   }

   function _invalidateIndex(index: number, invalidate_count?: number) {
      if (!cache.value[index]) cache.value[index] = {};
      // if (!cache.value[index].valid) return;

      mutate({ key: "valid", value: false, index });
      // mutate({ key: "invalidate_count", value: (cache.value[index].invalidate_count ?? 0) + 1, index });
      cache.value[index].invalidate_count = invalidate_count ?? (cache.value[index].invalidate_count ?? 0) + 1;
   }

   function invalidateFrom(index: number) {
      if (index === undefined) {
         invalidate(index);
      } else for (let i = index; i < count; i++)
         if (cache.value[i]) invalidate(i);
   }

   function invalidateCount(index: number) {
      if (index === undefined) console.warn("wrong invalidateCount call");
      return cache.value[index]?.invalidate_count;
   }

   function setCount(index?: number) {
      if (index === undefined) return set_counter;
      return cache.value[index]?.set_counter;
   }

   function clear(index?: number) {
      if (index == null)
         cache.value = new Array<CacheItem<T>>(count)
      else
         cache.value[index] = {}
   }

   function request(index: number) {
      mutate({ key: "request_index", value: index });
   }

   function requestIndex() {
      return cache.request_index;
   }

   function cleanup() {
      listeners.clear();
   }

   const cache = {
      id,
      count,
      value: new Array<CacheItem<T>>(count),
      get,
      set,
      invalidSet,
      mutate,
      onMutate,
      onChange,
      hasListener,
      unsubscribe,
      getLatest,
      getLatestValid,
      isValid,
      invalidate,
      invalidateFrom,
      invalidateCount,
      setCount,
      request,
      request_index: 0,
      requestIndex,
      cleanup,
   }

   global_dependencies.set(id, cache);
   return cache;
}

type Sketch = ReturnType<typeof constructSketch>
type SketchInitArgs = Dependency[]
type SketchFn<T> = (sketch: Sketch) => (T | ((...args: SketchInitArgs) => T));

export function createSketch<T>(fn: SketchFn<T>) {

   function init(...args: SketchInitArgs) {
      const name = `sketch ${global_sketch_id++}`;

      const main_worker_name = ROOT_WORKER_NAME;

      let worker_id = 0;
      const gen_worker_name = () => `${name} worker ${worker_id++}`

      const sketch = constructSketch(name, main_worker_name, gen_worker_name);

      let _sketch_output = fn(sketch);
      let sketch_output = typeof _sketch_output === 'function'
         ? (_sketch_output as ((...args: SketchInitArgs) => T))(...args)
         : _sketch_output;

      return sketch_output;
   }

   return {
      init,
   }
}

export function createSketchWorker<T>(fn: SketchFn<T>) {

   function init(...args: SketchInitArgs) {
      const name = `sketch ${global_sketch_id++}`;

      const main_worker_name = `${name} main worker`;

      let worker_id = 0;
      const gen_worker_name = () => `${name} worker ${worker_id++}`

      const sketch = constructSketch(name, main_worker_name, gen_worker_name);

      let _sketch_output = fn(sketch);
      let sketch_output = typeof _sketch_output === 'function'
         ? (_sketch_output as ((...args: SketchInitArgs) => T))(...args)
         : _sketch_output;

      createWorker<
         { id: number, action: Action },
         { id: number, action: Action }
      >(
         main_worker_name,
         ROOT_WORKER_NAME,
         () => {
            for (const dependency of Object.values(sketch_output as SketchInitArgs)) {
               dependency?.onMutate({}, ({ id }, action) => action.source !== ROOT_WORKER_NAME && postMessage({ id, action: { ...action, source: WORKER_NAME } }));
            }
            args.forEach(dependency => {
               dependency?.onMutate({}, ({ id }, action) => action.source !== ROOT_WORKER_NAME && postMessage({ id, action: { ...action, source: WORKER_NAME } }));
            });
            [...global_dependencies.values()].filter(dep => dep.name).forEach(dependency => {
               dependency?.onMutate({}, ({ id }, action) => action.source !== ROOT_WORKER_NAME && postMessage({ id, action: { ...action, source: WORKER_NAME } }));
            });
         },
         (data) => {
            const { id, action } = data;
            const dependency = global_dependencies.get(id);
            dependency?.mutate(action);
         },
         (worker) => {
            for (const dependency of Object.values(sketch_output as SketchInitArgs)) {
               dependency?.onMutate({}, ({ id }, action) => action.source !== main_worker_name && worker.postMessage({ id, action: { ...action, source: WORKER_NAME } }));
            }
            args.forEach(dependency => {
               dependency?.onMutate({}, ({ id }, action) => action.source !== main_worker_name && worker.postMessage({ id, action: { ...action, source: WORKER_NAME } }));
            });
            [...global_dependencies.values()].filter(dep => dep.name).forEach(dependency => {
               // console.log(dependency);
               dependency?.onMutate({}, ({ id }, action) => action.source !== main_worker_name && worker.postMessage({ id, action: { ...action, source: WORKER_NAME } }));
               worker.postMessage({ id: dependency.id, action: { key: "value", value: (dependency as Parameter<any>).get() } });
            });
         },
         (data) => {
            const { id, action } = data;
            const dependency = global_dependencies.get(id);
            dependency?.mutate(action);
         },
      );

      return sketch_output;
   }

   return {
      init,
   }
}

type UI = {
   createContainer: (callback: (ui: UI) => void) => void;
   createViewContainer: (callback: (ui: UI) => void) => void;
   createWindow: (callback: (ui: UI) => void) => void;
   createTimeline: (frames: number, tick_par: Parameter<number>, running_par: Parameter<boolean>, caches: Cache<any>[]) => void;
   createView: (frame_par: Parameter<OffscreenCanvas>) => void;
   createCacheView: (tick_par: Parameter<number>, running_par: Parameter<boolean>, frame_cache: Cache<OffscreenCanvas>) => void;
   createParameterNumber: (name: string, parameter: Parameter<number>, options: ParameterNumberOptions) => void;
}

export type ParameterNumberOptions = {
   min?: number;
   max?: number;
   step?: number;
   range?: number;
}

type Cleanup = () => void;
export type SetupCallback = (createUI: CreateUI) => Cleanup;
type CreateUI = (callback: (ui: UI) => void) => void;

function createSetup(sketch_path: string, callback: SetupCallback) {
   function setup(createUI: CreateUI) {
      resetGlobals(sketch_path);

      callback(createUI);

      const dependencies = [...global_dependencies.values()]
      const workers = [...global_workers]

      return () => {
         console.log("cleanup!!!", WORKER_NAME, dependencies, workers);
         dependencies.forEach(dependency => dependency.cleanup());
         workers.forEach(worker => worker.terminate());
      }
   }
   if (WORKER_NAME !== ROOT_WORKER_NAME) setup(() => { });
   return setup;
}

type Count_or_queue<T> = number | T[] | Parameter<number> | Parameter<T[]>
type UpdateCallback<T> = (state: T, tick: number) => T
type ConstructCallback<T, U> = (state: T, index: number, count: number, item: U) => T
type SimulateCallback<T> = (state: T, index: number, count: number, t: number) => T

type DrawCallback = () => OffscreenCanvas;
type GenerateCallback<T> = (index: number, count: number, item: T) => OffscreenCanvas;
type AnimateCallback = (frame: number, t: number) => OffscreenCanvas;

function constructSketch(name: string, main_worker_name: string, gen_worker_name: () => string) {

   function update<T>(initial_state: T | Parameter<T>, callback: UpdateCallback<T>) {

      const initial_state_par = isParameter(initial_state)
         ? initial_state as Parameter<T>
         : createParameter<T>(initial_state as T);
      const state_par = createParameter(initial_state_par.value);
      const tick_par = createParameter(0);

      let state: T;
      const worker = createReactiveWorker<T>(
         gen_worker_name(),
         main_worker_name,
         {
            executeWorker: () => {
               const tick = tick_par.get()
               if (tick === 0) state = structuredClone(initial_state_par.get());
               state = callback(state, tick) ?? state;
               return state;
            },
            receive: (state) => state_par.set(state),
            onDependencyChanged: (id) => {
               if (id === initial_state_par.id) tick_par.set(0)
               else if (id !== tick_par.id) tick_par.set(tick_par.value + 1);
            }
         }
      );

      return state_par;
   }

   function construct<T>(initial_state: T | Parameter<T>, count: number, interval_ms: number, callback: ConstructCallback<T, number>): Parameter<T>;
   function construct<T>(initial_state: T | Parameter<T>, count_par: Parameter<number>, interval_ms: number, callback: ConstructCallback<T, number>): Parameter<T>;
   function construct<T, U>(initial_state: T | Parameter<T>, queue: U[], interval_ms: number, callback: ConstructCallback<T, U>): Parameter<T>;
   function construct<T, U>(initial_state: T | Parameter<T>, queue_par: Parameter<U[]>, interval_ms: number, callback: ConstructCallback<T, U>): Parameter<T>;
   function construct<T, U>(initial_state: T | Parameter<T>, count_or_queue: Count_or_queue<U>, interval_ms: number, callback: ConstructCallback<T, U>) {

      const initial_state_par = isParameter(initial_state)
         ? initial_state as Parameter<T>
         : createParameter<T>(initial_state as T);
      const state_par = createParameter(initial_state_par.value);

      let state: T;

      const worker = createReactiveQueueWorker(
         gen_worker_name(),
         main_worker_name,
         count_or_queue,
         interval_ms,
         {
            executeWorker: (index, count, item) => {
               if (count <= index) index = 0;
               if (index === 0) state = structuredClone(initial_state_par.get());

               const new_state = callback(state, index, count, item)
               state = new_state ?? state;
               return state;
            },
            sendWorker: (state) => state ?? initial_state_par.get(),
            receive: (state) => state_par.set(state),
         }
      );

      return state_par;
   }

   function simulate<T>(initial_state: T, count: number, callback: SimulateCallback<T>, options: ReactiveCacheWorkerOptions = {}) {
      options = { strategy: "ping", max_queue_length: 1, ...options };

      const initial_state_par = isParameter(initial_state)
         ? initial_state as Parameter<T>
         : createParameter<T>(initial_state as T);
      const state_cache = createCache(count);
      state_cache.set(0, initial_state_par.value);
      state_cache.invalidate(0);

      const previous_states: T[] = [];
      const worker = createReactiveCacheWorker(
         gen_worker_name(),
         main_worker_name,
         state_cache,
         {
            executeWorker: (index) => {
               const i = mod(index, count);

               const initial_state = initial_state_par.get();

               let state = structuredClone(i > 0
                  ? previous_states[i - 1]
                  : initial_state
               );
               const t = i / count;

               const new_state = callback(state, i, count, t);
               state = new_state ?? state;
               previous_states[i] = state;

               return state
            },
            receive: (index, state, valid) => {
               if (!valid) return;
               state_cache.set(index, state);
            },
         },
         options,
      );

      return state_cache;
   }

   function draw(callback: DrawCallback) {

      const frame_par = createParameter<ImageBitmap | null>(null);

      createReactiveWorker(
         gen_worker_name(),
         main_worker_name,
         {
            executeWorker: () => {
               // console.log("> execute draw");
               const canvas = callback();
               const ctx = canvas.getContext('2d');
               const bitmap = canvas.transferToImageBitmap();
               ctx?.drawImage(bitmap, 0, 0);
               return bitmap;
            },
            receive: (bitmap) => {
               // console.log("< receive draw");
               frame_par.set(bitmap);

               // const canvas = frame_par.get() ?? createCanvas(bitmap.width, bitmap.height);
               // const ctx = canvas.getContext("bitmaprenderer");
               // ctx?.transferFromImageBitmap(bitmap);
               // frame_par.set(canvas, true);
               // bitmap.close();
            },
         },
      );

      return frame_par;
   }

   function generate<T>(count: number, interval_ms: number, callback: GenerateCallback<number>, options: ReactiveQueueWorkerOptions): Parameter<ImageBitmap | undefined>;
   function generate<T>(count_par: Parameter<number>, interval_ms: number, callback: GenerateCallback<number>, options: ReactiveQueueWorkerOptions): Parameter<ImageBitmap | undefined>;
   function generate<T>(queue: T[], interval_ms: number, callback: GenerateCallback<T>, options: ReactiveQueueWorkerOptions): Parameter<ImageBitmap | undefined>;
   function generate<T>(queue_par: Parameter<T[]>, interval_ms: number, callback: GenerateCallback<T>, options: ReactiveQueueWorkerOptions): Parameter<ImageBitmap | undefined>;
   function generate<T>(count_or_queue: Count_or_queue<T>, interval_ms: number, callback: GenerateCallback<T>, options: ReactiveQueueWorkerOptions) {

      const frame_par = createParameter<ImageBitmap | undefined>(undefined);

      const worker = createReactiveQueueWorker(
         gen_worker_name(),
         main_worker_name,
         count_or_queue,
         interval_ms,
         {
            executeWorker: callback,
            sendWorker: (canvas) => {
               if (canvas === undefined) return;
               const bitmap = canvas.transferToImageBitmap();
               const ctx = canvas.getContext('2d');
               ctx?.drawImage(bitmap, 0, 0);
               return bitmap;
            },
            receive: (bitmap) => {
               frame_par.set(bitmap);

               // if (!bitmap) {
               //    frame_par.set(undefined);
               //    return;
               // }
               // const canvas = frame_par.get() ?? createCanvas(bitmap.width, bitmap.height);
               // const ctx = canvas.getContext("bitmaprenderer");
               // ctx?.transferFromImageBitmap(bitmap);
               // frame_par.set(canvas, true);
               // bitmap.close();
            }
         },
         options,
      );

      return frame_par;
   }

   function animate(frames: number, callback: AnimateCallback, options: ReactiveCacheWorkerOptions) {
      // options = { ...options };

      const frame_cache = createCache<HTMLImageElement | null>(frames);
      // let canvases: OffscreenCanvas[] = [];
      let canvas: OffscreenCanvas;
      let images: HTMLImageElement[] = [];
      const worker = createReactiveCacheWorker(
         gen_worker_name(),
         main_worker_name,
         frame_cache,
         {
            executeWorker: (index) => {
               const i = mod(index, frames);

               const t = i / frames;
               const canvas = callback(i, t);
               if (!canvas) return null;

               const bitmap = canvas.transferToImageBitmap();

               const ctx = canvas.getContext('2d');
               ctx?.drawImage(bitmap, 0, 0);

               return bitmap
            },
            // receive: async (index, bitmap, valid, invalidate_count) => {
            //    if (!bitmap) {
            //       frame_cache.set(index, null);
            //       return;
            //    }

            //    // const canvas = canvases[index] ?? createCanvas(bitmap.width, bitmap.height);
            //    // canvas ??= createCanvas(bitmap.width, bitmap.height);
            //    canvas = createCanvas(bitmap.width, bitmap.height);

            //    const ctx = canvas.getContext("bitmaprenderer");
            //    ctx?.transferFromImageBitmap(bitmap);
            //    bitmap.close();

            //    // frame_cache.value.forEach((item, index) => {
            //    //    if (item.value === canvas)
            //    //       item.valid = false;
            //    // });
            //    // frame_cache.set(index, canvas, true);
            //    // frame_cache.invalidSet(index, canvas, true);

            //    if (frame_cache.invalidateCount(index) !== invalidate_count) return;

            //    if (valid) frame_cache.set(index, canvas, true);
            //    else frame_cache.invalidSet(index, canvas, true);

            //    if (typeof Image === "undefined") return;

            //    const blob = await canvas.convertToBlob();
            //    const url = URL.createObjectURL(blob);
            //    const image = images[index] ?? new Image();

            //    image.onload = () => {
            //       // no longer need to read the blob so it's revoked
            //       URL.revokeObjectURL(url);

            //       if (frame_cache.invalidateCount(index) !== invalidate_count) return;

            //       if (valid) frame_cache.set(index, image, true);
            //       else frame_cache.invalidSet(index, image, true);
            //    };
            //    image.src = url;
            // }
         },
         options
      );

      return frame_cache;
   }

   return {
      update,
      construct,
      simulate,

      draw,
      generate,
      animate,
   }
}

type ExecuteWorker<T> = () => T | void;
type ReceiveWorker<T> = (data: T) => void;
type Execute<T> = (worker: Worker) => T | void;
type Receive<T> = (data: T) => void;

export function createWorker<T, U>(name: string, parent_name: string, executeWorker?: ExecuteWorker<T>, receiveWorker?: ReceiveWorker<T>, execute?: Execute<U>, receive?: Receive<U>) {

   if (WORKER_NAME === name) {
      addEventListener("message", (evt) => receiveWorker?.(evt.data));

      const res = executeWorker?.();
      if (res !== undefined) postMessage(res);
   }
   else if (WORKER_NAME === parent_name) {
      const worker = new Worker(new URL(global_sketch_path, import.meta.url), { type: "module", name });
      global_workers.add(worker);

      worker.addEventListener("message", (evt) => receive?.(evt.data));

      const res = execute?.(worker);
      if (res !== undefined) worker.postMessage(res);

      return worker;
   }
}

type OnDependencyChanged = (id: number, index?: number) => void;
type Dependencies_ids_and_indexes = { id: number, index?: number, set_count?: number }[]
type ReceiveWorkerReactive = ReceiveWorker<{ id: number, action: Action }>
type ExecuteReactive<T> = Execute<{ value: T, dependencies_ids_and_indexes: Dependencies_ids_and_indexes }>;
type ReceiveReactive<T> = (value: T, dependencies_ids_and_indexes: Dependencies_ids_and_indexes) => void;

type ReactiveWorkerCallbacks<T> = {
   executeWorker?: ExecuteWorker<T>,
   receiveWorker?: ReceiveWorkerReactive,
   execute?: ExecuteReactive<T>,
   receive?: ReceiveReactive<T>,
   onDependencyChanged?: OnDependencyChanged
}

type ReactiveWorkerOptions = { transfer_value?: boolean };

export function createReactiveWorker<T>(
   name: string,
   parent_name: string,
   {
      executeWorker,
      receiveWorker,
      execute,
      receive,
      onDependencyChanged,
   }: ReactiveWorkerCallbacks<T>,
   options: ReactiveWorkerOptions = {},
) {
   const { transfer_value } = options;

   const dependecy_records: { id: number, index?: number }[] = [];
   const hasDependencyRecord = (id: number, index?: number) => dependecy_records.some(r => r.id === id && r.index === index);
   const addDependencyRecord = (id: number, index?: number) => dependecy_records.push({ id, index });

   const retrig_par = createParameter(false);

   const worker = createWorker<
      { id: number, action: Action },
      { value: T, dependencies_ids_and_indexes: Dependencies_ids_and_indexes }
   >(
      name,
      parent_name,
      () => {
         createEffect(() => {
            retrig_par.get();
            const ret = executeWorker?.();
            const dependencies_ids_and_indexes = [...(global_effect_dependencies() ?? [])]
               .map(({ dependency, index }) => ({ id: dependency.id, index, set_count: dependency.setCount(index) }));
            if (ret !== undefined) {
               if (transfer_value) {
                  console.log(ret);
                  postMessage({ value: ret, dependencies_ids_and_indexes }, "*", [ret as Transferable]);
               } else postMessage({ value: ret, dependencies_ids_and_indexes })
            }
         }, { batch: true });
      },
      (data) => {
         const { id, action } = data;
         const dependency = global_dependencies.get(id);
         if (!dependency) {
            console.warn("dependency not found", id, global_dependencies);
            return;
         }
         // console.log(action);
         dependency.mutate(action);
         retrig_par.set(!retrig_par.value);
         receiveWorker?.(data);
      },
      execute,
      (data) => {
         const { value, dependencies_ids_and_indexes } = data;
         receive?.(value, dependencies_ids_and_indexes);

         dependencies_ids_and_indexes.forEach(({ id, index, set_count }) => {
            const dep = global_dependencies.get(id);
            if (!dep) {
               console.warn("dependency not found", id, global_dependencies);
               return;
            }

            if (!dep.hasListener(onDepChange)) {
               onDepChange(dep, { key: "value", value: (dep as Parameter<any> | Cache<any>).get(), set_count: dep.setCount() });
            } else {
               dep.unsubscribe(onDepChange);
            }

            if (!hasDependencyRecord(id, index)) {
               const current_set_count = dep.setCount(index);
               if (set_count !== current_set_count) {
                  onDepChange(dep, { key: "value", index, value: dep.get(index), set_count: current_set_count });
               }
            }

            dep.onChange(onDepChange);
         });
      }
   );

   function onDepChange(dependency: Dependency, action: Action) {
      const { id } = dependency;
      worker?.postMessage({ id, action });

      const { index } = action;
      addDependencyRecord(id, index);
      onDependencyChanged?.(dependency.id, index);
   }

   return worker;
}

type SendWorker<T, U> = (value?: U) => T
type ExecuteWorkerReactiveQueue<T, U> = (index: number, count: number, item: U) => T
type ReactiveQueueWorkerOptions = { reset_on_count_change?: boolean, reset_on_queue_change?: boolean };
type ReactiveQueueWorkerCallbacks<T, U, V> = {
   executeWorker?: ExecuteWorkerReactiveQueue<V, U>,
   receiveWorker?: ReceiveWorkerReactive,
   sendWorker?: SendWorker<T, V>,
   execute?: ExecuteReactive<T>,
   receive?: ReceiveReactive<T>,
   onDependencyChanged?: OnDependencyChanged,
}

export function createReactiveQueueWorker<T, U, V>(
   name: string,
   parent_name: string,
   count_or_queue: Count_or_queue<U>,
   interval_ms: number,
   {
      executeWorker,
      receiveWorker,
      sendWorker,
      execute,
      receive,
      onDependencyChanged,
   }: ReactiveQueueWorkerCallbacks<T, U, V>,
   options: ReactiveQueueWorkerOptions = {}
) {

   const count_or_queue_par = isParameter(count_or_queue) ? count_or_queue as Parameter<number | any[]> : createParameter(count_or_queue);
   const { reset_on_count_change, reset_on_queue_change } = options;

   let queue_par: Parameter<U[]>;
   let count_par: Parameter<number>;

   const value = count_or_queue_par.get();
   if (typeof value === 'number')
      count_par = count_or_queue_par as Parameter<number>
   else
      queue_par = count_or_queue_par as Parameter<U[]>

   let index = 0;
   let timeout: number;

   const worker = createReactiveWorker(
      name,
      parent_name,
      {
         executeWorker: () => {
            clearTimeout(timeout);
            work();

            function work() {
               if (!executeWorker) return;

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
                  ret = executeWorker(index, count, item);
               }
               const dependencies = global_effect_dependencies_stack.pop();
               const dependencies_ids_and_indexes = [...(dependencies ?? [])]
                  .map(({ dependency, index }) => ({ id: dependency.id, index }));

               const value = sendWorker?.(ret);
               postMessage({ value, dependencies_ids_and_indexes })

               if (index != count) {
                  clearTimeout(timeout);
                  timeout = setTimeout(work);
               }
            }
         },

         receiveWorker: (data) => {
            const { id, action } = data;
            const { value } = action;

            const dependency = global_dependencies.get(id);
            if (!dependency) {
               console.warn("dependency not found", id, global_dependencies);
               return;
            }

            if (count_par?.id === id) {
               if (reset_on_count_change) index = 0;
               if (value <= index) index = 0;
            } else if (queue_par?.id === id) {
               if (reset_on_queue_change) index = 0;
               else if (value.length <= index) index = 0;
               else if (value.length === (dependency as typeof queue_par).value.length) index = 0;
            } else {
               index = 0;
            }

            receiveWorker?.(data);
         },

         execute,
         receive,
         onDependencyChanged,
      }
   );

   return worker;
}

type ExecuteWorkerReactiveCache<T> = (index: number) => T | null
type ReactiveCacheWorkerOptions = {
   interval_ms?: number,
   // timeout_ms?: number,
   // batch_timeout_ms?: number,
   max_queue_length?: number,
   strategy?: "interval" | "ping",
   transfer_value?: boolean,
};
type ReceiveReactiveCache<T> = (
   index: number,
   value: T,
   valid: boolean,
   invalidate_count: number,
) => void;

type ReactiveCacheWorkerCallbacks<T, U> = {
   executeWorker?: ExecuteWorkerReactiveCache<U>,
   receiveWorker?: ReceiveWorkerReactive,
   execute?: ExecuteReactive<T>,
   receive?: ReceiveReactiveCache<U>,
   onDependencyChanged?: OnDependencyChanged,
}

export function createReactiveCacheWorker<T, U>(
   name: string,
   parent_name: string,
   cache: Cache<T>,
   {
      executeWorker,
      receiveWorker,
      execute,
      receive,
      onDependencyChanged,
   }: ReactiveCacheWorkerCallbacks<T, U>,
   options: ReactiveCacheWorkerOptions = {}
) {
   options = { max_queue_length: 1, strategy: "interval", ...options };
   const {
      interval_ms,
      max_queue_length,
      strategy,
      transfer_value
   } = options;

   const dependecy_records: { id: number, index?: number }[] = [];
   const hasDependencyRecord = (id: number, index?: number) => dependecy_records.some(r => r.id === id && r.index === index);
   const addDependencyRecord = (id: number, index?: number) => dependecy_records.push({ id, index });

   const retrig_par = createParameter(false);

   const worker = createWorker<
      ({ kind: "dependency", id: number, action: Action } | { kind: "invalidate", index: number, invalidate_count: number } | { kind: "retrig" }),
      { value: U, index: number, invalidate_count: number, dependencies_ids_and_indexes: Dependencies_ids_and_indexes }
   >(
      name,
      parent_name,
      () => {
         let timeout: number;
         createEffect(() => {
            retrig_par.get();
            clearTimeout(timeout);
            work();
         }, {
            batch: true,
         });

         function work() {
            if (cache.count == 0) return;

            if (strategy === "interval") {
               clearTimeout(timeout);
               timeout = setTimeout(work, interval_ms);
            }

            const maxQueueLength = () => max_queue_length === undefined || queue_count < max_queue_length
            let queue_count = 0;

            for (let i = 0; i < cache.count && maxQueueLength(); i++) {
               const index = mod(i + cache.requestIndex(), cache.count);
               if (cache.isValid(index)) continue;
               const invalidate_count = cache.invalidateCount(index);

               global_effect_dependencies_stack.push(new Set());
               const ret = executeWorker?.(index);

               const dependencies = global_effect_dependencies_stack.pop();
               const dependencies_ids_and_indexes = [...(dependencies ?? [])]
                  .map(({ dependency, index }) => ({ id: dependency.id, index }));

               if (ret) {
                  // const transfer = transfer_value ? [ret as Transferable] : [];
                  postMessage({ value: ret, index, invalidate_count, dependencies_ids_and_indexes });

                  if (ret !== undefined) cache.set(index, ret);
                  // receive?.(index, ret, true);
               }

               queue_count++;
            }

         }
      },
      (data) => {
         const { kind } = data;
         switch (kind) {
            case "dependency":
               const { id, action } = data;

               const dependency = global_dependencies.get(id);
               dependency?.mutate(action);

               receiveWorker?.(data);
               break;
            case "invalidate":
               const { index, invalidate_count } = data;
               cache.invalidate(index, invalidate_count);
               break;
            case "retrig":
               retrig_par.set(!retrig_par.value)
               break;
         }
      },
      (worker) => {
         execute?.(worker);
         // [...global_dependencies.values()].filter(dep => dep.name).forEach((dependency) => {
         //    dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
         // });
      },
      (data) => {
         const { value, index, invalidate_count, dependencies_ids_and_indexes } = data;

         index_dependencies[index] = dependencies_ids_and_indexes;
         const valid = cache.invalidateCount(index) === invalidate_count
            && dependencies_ids_and_indexes.every(({ id, index }) => {
               const dep = global_dependencies.get(id);
               return !dep.isValid || dep.isValid(index);
            });

         receive?.(index, value, valid, invalidate_count);

         dependencies_ids_and_indexes.forEach(({ id, index, set_count }) => {
            const dep = global_dependencies.get(id);
            if (!dep) {
               console.warn("dependency not found", id, global_dependencies);
               return;
            }

            if (!dep.hasListener(onDepChange)) {
               onDepChange(dep, { key: "value", value: (dep as Parameter<any> | Cache<any>).get(), set_count: dep.setCount() });
            } else {
               dep.unsubscribe(onDepChange);
               dep.unsubscribe(onDepInvalidate);
            }

            if (!hasDependencyRecord(id, index)) {
               // addDependencyRecord(id, index);
               const current_set_count = dep.setCount(index);
               if (set_count !== current_set_count) {
                  onDepChange(dep, { key: "value", index, value: dep.get(index), set_count: current_set_count });
               }
            }

            dep.onChange(onDepChange);
            dep.onMutate({ key: "valid", value: false }, onDepInvalidate);
         });

         if (strategy === "ping") retrig();
      },
   );

   let retrig_timeout: number;
   function retrig() {
      clearTimeout(retrig_timeout);
      retrig_timeout = setTimeout(() =>
         worker?.postMessage({ kind: "retrig" })
      );
   }

   const index_dependencies: Dependencies_ids_and_indexes[] = []

   function invalidate(index: number) {
      cache.invalidate(index)
      const invalidate_count = cache.invalidateCount(index);
      worker?.postMessage({ kind: "invalidate", index, invalidate_count });
   }


   function onDepChange(dependency: Dependency, action: Action) {

      const { id } = dependency;
      worker?.postMessage({ kind: "dependency", id, action });

      retrig()

      const { index } = action;
      addDependencyRecord(id, index);

      index_dependencies.forEach((dependencies_ids_and_indexes, i) => {
         if (dependencies_ids_and_indexes.find((dep) =>
            dep.id === id && (dep.index === undefined || dep.index === index)
         )) {
            invalidate(i);
         }
      });

      onDependencyChanged && onDependencyChanged(id, index);
   }

   function onDepInvalidate(dependency: Dependency, action: Action) {

      const { id } = dependency;
      const { index } = action;

      index_dependencies.forEach((dependencies_ids_and_indexes, i) => {
         if (dependencies_ids_and_indexes.find((dep) =>
            dep.id === id && (dep.index === undefined || dep.index === index)
         )) {
            invalidate(i);
         }
      });
   }

   cache.onMutate(
      { key: "request_index" },
      ({ id }, action) => worker?.postMessage({ kind: "dependency", id, action })
   );

   return worker;
}

// export function createLoop(callback, interval = 0) {
//    let timeout;
//    const loop = () => {
//       if (!ret.running) return
//       callback();
//       timeout = setTimeout(loop, interval);
//    }
//    const ret = {
//       stop() {
//          this.running = false;
//          clearTimeout(timeout);
//       },
//       start() {
//          this.running = true;
//          loop();
//       },
//       toggle() {
//          if (this.running)
//             this.stop();
//          else
//             this.start();
//       }
//    }
//    ret.start();
//    return ret;
// }

export default {
   createSketch,
   createSketchWorker,
   createSetup,
}