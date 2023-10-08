import { mod } from "./library/Utils.js"
// import SKETCH_PATH from "./sketch.js?url"

const SKETCH_PATH = "/sketches/sketch.js";
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
}

export type Parameter<T> = Dependency & {
   value: T;
   set: (value: T) => void;
   get: () => T;
}

// type Parameter<T> = ReturnType<typeof createParameter<T>>;

export type Cache<T> = Dependency & {
   value: CacheItem<T>[]
   count: number,
   get: (() => CacheItem<T>[]) | ((index: number) => T),
   getLatest: (index: number) => T | undefined,
   getLatestValid: (index: number) => T | undefined,
   set: (index: number, value: T) => void,
   invalidSet: (index: number, value: T) => void,
   invalidate: (index: number, invalidate_count?: number) => void,
   isValid: (index: number) => boolean,
   invalidateCount: (index: number) => number | undefined,
   onGet: (callback: onGetCallback) => void,
}

// type Cache<T> = ReturnType<typeof createCache<T>>;

export type Action = {
   key: string;
   value: any;
   index?: number;
   validate?: boolean;
   source?: string;
   set_count?: number;
}

export type Match = {
   key?: string;
   value?: any;
   index?: number;
   validate?: boolean;
   source?: string;
} | ((action: Action) => boolean);

export type StackDependency = {
   dependency: Dependency;
   index?: number;
}

const ROOT_WORKER_NAME = "root"
const WORKER_NAME = self.name || ROOT_WORKER_NAME;
console.log("WORKER_NAME", WORKER_NAME);

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


export function resetGlobals() {
   global_dependencies = new Map();
   global_dependency_id = 0;
   global_workers = new Set();
   global_sketch_id = 0;
   global_effect_dependencies_stack = [new Set()];
}

export function cleanupGlobals() {
   global_dependencies.forEach(dependency => dependency.cleanup());
   global_workers.forEach(worker => worker.terminate());
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
      const { key, value, set_count } = action; // @ts-ignore
      if (parameter[key] === value) return; // @ts-ignore
      parameter[key] = value;

      if (key === "value") {
         set_counter = set_count ?? set_counter + 1;
         action.set_count = set_counter;
         // mutate({ key: "set_counter", value: set_counter });
         if (name && typeof localStorage !== 'undefined') localStorage[name] = JSON.stringify(value);
      }
      listeners.forEach(({ match, callback }) => matchActionTest(match, action) && callback(parameter, action))
   }

   function set(value: T) {
      mutate({ key: "value", value });
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
   let get_listeners = new Set<onGetCallback>();
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
   function onGet(callback: onGetCallback) {
      get_listeners.add(callback);
   }
   function unsubscribe(callback: onMutateCallback | onGetCallback) {
      listeners = new Set([...listeners].filter(l => l.callback !== callback));
      get_listeners = new Set([...get_listeners].filter(c => c !== callback));
   }
   function mutate(action: Action) {
      action.source ??= WORKER_NAME;
      const { key, value, index, set_count } = action;
      if (index !== undefined) {
         // @ts-ignore
         if (cache.value[index]?.[key] === value) return;
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
         if (cache[key] === value) return

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
   function set(index: number, value: T) {
      if (index === undefined || value === undefined) console.warn("set, wrong arguments: index and value undefined");
      mutate({ key: "value", index, value });
      validate(index);
   }
   function invalidSet(index: number, value: T) {
      if (index === undefined || value === undefined) console.warn("set, wrong arguments: index and value undefined");
      mutate({ key: "value", index, value });
   }

   function get(): CacheItem<T>[];
   function get(index: number): T;
   function get(...args: ([] | [number])) {
      if (args.length == 0) return _getAll();
      if (args.length == 1) return _getIndex(...args);
   }
   function _getAll() {
      get_listeners.forEach(callback => callback())
      global_effect_dependencies()?.add({ dependency: cache });
      return cache.value;
   }
   function _getIndex(index: number) {
      get_listeners.forEach(callback => callback(index))
      global_effect_dependencies()?.add({ dependency: cache, index });
      return cache.value[index]?.value;
   }
   function getLatest(index = count - 1) {
      get_listeners.forEach(callback => callback(index))

      if (cache.value[index]?.value !== undefined) {
         global_effect_dependencies()?.add({ dependency: cache, index });
         return cache.value[index].value;
      }
      global_effect_dependencies()?.add({ dependency: cache });
      for (let i = 0; i < count; i++) {
         const value = cache.value[mod(index - i, count)]?.value;
         if (value !== undefined)
            return value;
      }
   }
   function getLatestValid(index = count - 1) {
      get_listeners.forEach(callback => callback(index, true))

      if (isValid(index)) {
         global_effect_dependencies()?.add({ dependency: cache, index });
         return cache.value[index].value;
      }
      global_effect_dependencies()?.add({ dependency: cache });
      for (let i = 0; i < count; i++) {
         const item = cache.value[mod(index - i, count)];
         if (!item) continue;
         const { value, valid } = item;
         if (valid) return value;
      }

      return getLatest(index);
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
   function cleanup() {
      listeners.clear();
      get_listeners.clear();
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
      onGet,
      hasListener,
      unsubscribe,
      getLatest,
      getLatestValid,
      isValid,
      invalidate,
      invalidateFrom,
      invalidateCount,
      setCount,
      cleanup,
   }

   global_dependencies.set(id, cache);
   return cache;
}

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
         sketch.main_worker_name,
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

type Sketch = ReturnType<typeof constructSketch>
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
            // (data) => { },
            sendWorker: (state) => state ?? initial_state_par.get(),
            // (worker) => { },
            receive: (state) => state_par.set(state),
            // (id, index) => { },
         }
      );

      return state_par;
   }

   function simulate<T>(initial_state: T | Parameter<T>, count: number, callback: SimulateCallback<T>) {

      const initial_state_par = isParameter(initial_state)
         ? initial_state as Parameter<T>
         : createParameter(initial_state as T);

      const index_par = createParameter<{ index: number, invalidate_count: number | undefined }>({ index: 0, invalidate_count: undefined });
      const state_cache = createCache<T>(count);
      state_cache.set(0, initial_state_par.get());

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

      const index_dependencies: Dependencies_ids_and_indexes[] = [];
      const previous_states = [initial_state_par.get()];
      const worker = createReactiveWorker(
         gen_worker_name(),
         main_worker_name,
         {
            executeWorker: () => {
               previous_states[0] = initial_state_par.get();
               const { index, invalidate_count } = index_par.get();
               const i = mod(index, count);
               let state = structuredClone(previous_states[i - 1]);
               const t = i / count;

               const new_state = callback(state, i, count, t);
               state = new_state ?? state;
               previous_states[i] = structuredClone(state);

               return { i, state, invalidate_count }
            },

            receive: ({ i, state, invalidate_count }, dependencies_ids_and_indexes) => {
               index_dependencies[i] = dependencies_ids_and_indexes;

               // if (state_cache.isValid(i)) return;
               if (state_cache.invalidateCount(i) !== invalidate_count) return

               state_cache.set(i, state);
               // state_cache.invalidateFrom(i + 1)
               requestNextIndex();
            },

            onDependencyChanged: (id, index) => {
               if (id === index_par.id) return;
               index_dependencies.forEach((dependencies_ids_and_indexes, i) => {
                  if (dependencies_ids_and_indexes.find((dep) =>
                     dep.id === id && (dep.index === undefined || dep.index === index)
                  )) {
                     state_cache.invalidate(i);
                  }
               });
               requestNextIndex();
            },
         }
      );

      return state_cache;
   }

   function simulateQueue<T>(initial_state: T, count: number, callback: SimulateCallback<T>, options: ReactiveCacheWorkerOptions = {}) {
      options = { strategy: "ping", ...options };

      const state_cache = createCache(count);
      state_cache.set(0, initial_state);

      const previous_states = [initial_state];
      const worker = createReactiveCacheWorker(
         gen_worker_name(),
         main_worker_name,
         state_cache,
         {
            executeWorker: (index) => {
               const i = mod(index, count);

               if (i === 0) {
                  previous_states[0] = structuredClone(initial_state);
                  return previous_states[0];
               }

               let state = structuredClone(previous_states[i - 1]);
               const t = i / count;

               const new_state = callback(state, i, count, t);
               state = new_state ?? state;
               previous_states[i] = state;

               return state
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
               const canvas = callback();
               const ctx = canvas.getContext('2d');
               const bitmap = canvas.transferToImageBitmap();
               ctx?.drawImage(bitmap, 0, 0);
               return bitmap;
            },
            receive: (bitmap) => frame_par.set(bitmap),
         }
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
            receive: (bitmap) => frame_par.set(bitmap),
         },
         options,
      );

      return frame_par;
   }
   function animate(frames: number, callback: AnimateCallback) {

      const index_par = createParameter<{ index: number, invalidate_count?: number }>({ index: 0, invalidate_count: 0 });
      const frame_cache = createCache<ImageBitmap>(frames);

      let start_frame = 0;
      frame_cache.onGet((index, getLatestValid) => getLatestValid
         ? start_frame = 0
         : start_frame = index ?? 0
      );

      const requestNextFrame = () => {
         for (let i = 0; i < frames; i++) {
            const frame = mod(start_frame + i, frames);
            if (!frame_cache.isValid(frame)) {
               const new_index = {
                  index: frame,
                  invalidate_count: frame_cache.invalidateCount(frame),
               };
               if (index_par.value?.index === new_index.index &&
                  index_par.value?.invalidate_count === new_index.invalidate_count) {
                  return;
               }
               index_par.set(new_index)
               return
            }
         }
      }
      requestNextFrame();

      const frames_dependencies: Dependencies_ids_and_indexes[] = [];
      const worker = createReactiveWorker(
         gen_worker_name(),
         main_worker_name,

         {
            executeWorker: () => {
               const { index, invalidate_count } = index_par.get();
               const i = mod(index, frames);

               const t = i / frames;
               const canvas = callback(i, t);
               const ctx = canvas.getContext('2d');
               const bitmap = canvas.transferToImageBitmap();
               ctx?.drawImage(bitmap, 0, 0);

               return { i, bitmap, invalidate_count }
            },

            receive: ({ i, bitmap, invalidate_count }, dependencies_ids_and_indexes) => {
               if (frame_cache.isValid(i)) return;

               if (frame_cache.invalidateCount(i) !== invalidate_count) {
                  frame_cache.invalidSet(i, bitmap);
                  return;
               }

               frame_cache.set(i, bitmap);
               frames_dependencies[i] = dependencies_ids_and_indexes;
               requestNextFrame();
            },

            onDependencyChanged: (dependency_id, dependency_index) => {
               if (dependency_id === index_par.id) return;

               frames_dependencies.forEach((dependencies_ids_and_indexes, frame) => {
                  if (dependencies_ids_and_indexes.find(({ id, index }) =>
                     dependency_id === id && (index === undefined || index === dependency_index)
                  )) {
                     frame_cache.invalidate(frame)
                  }
               });

               requestNextFrame();
            }
         }
      );

      return frame_cache;
   }

   function animateQueue<T>(frames: number, callback: AnimateCallback, options: ReactiveCacheWorkerOptions) {
      options = { invalid_set: true, ...options };

      const frame_cache = createCache<ImageBitmap>(frames);

      const worker = createReactiveCacheWorker(
         gen_worker_name(),
         main_worker_name,
         frame_cache,
         {
            executeWorker: (index) => {
               const i = mod(index, frames);

               const t = i / frames;
               const canvas = callback(i, t);
               const ctx = canvas.getContext('2d');
               const bitmap = canvas.transferToImageBitmap();
               ctx?.drawImage(bitmap, 0, 0);

               return bitmap
            },

         },
         options
      );

      return frame_cache;
   }

   return {
      name,
      main_worker_name,

      update,
      construct,
      simulate,
      simulateQueue,

      draw,
      generate,
      animate,
      animateQueue,
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
      const worker = new Worker(new URL(SKETCH_PATH, import.meta.url), { type: "module", name });
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

export function createReactiveWorker<T>(
   name: string,
   parent_name: string,
   {
      executeWorker,
      receiveWorker,
      execute,
      receive,
      onDependencyChanged,
   }: ReactiveWorkerCallbacks<T>
) {

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
            if (ret !== undefined) postMessage({ value: ret, dependencies_ids_and_indexes })
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
               onDepChange(dep, { key: "value", value: dep.get(), set_count: dep.setCount() });
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

type ExecuteWorkerReactiveCache<T> = (index: number) => T
type ReactiveCacheWorkerOptions = {
   interval_ms?: number,
   // timeout_ms?: number,
   // batch_timeout_ms?: number,
   max_queue_length?: number,
   invalid_set?: boolean,
   strategy?: "interval" | "ping",
};
type ReceiveReactiveCache<T> = (
   value: T,
   index: number,
   invalidate_count: number,
   dependencies_ids_and_indexes: Dependencies_ids_and_indexes
) => void;

type ReactiveCacheWorkerCallbacks<T> = {
   executeWorker?: ExecuteWorkerReactiveCache<T>,
   receiveWorker?: ReceiveWorkerReactive,
   execute?: ExecuteReactive<T>,
   receive?: ReceiveReactiveCache<T>,
   onDependencyChanged?: OnDependencyChanged,
}

export function createReactiveCacheWorker<T>(
   name: string,
   parent_name: string,
   cache: Cache<T>,
   {
      executeWorker,
      receiveWorker,
      execute,
      receive,
      onDependencyChanged,
   }: ReactiveCacheWorkerCallbacks<T>,
   options: ReactiveCacheWorkerOptions = {}
) {
   options = { max_queue_length: 1, strategy: "interval", ...options };
   const {
      interval_ms,
      max_queue_length,
      invalid_set,
      strategy
   } = options;

   const dependecy_records: { id: number, index?: number }[] = [];
   const hasDependencyRecord = (id: number, index?: number) => dependecy_records.some(r => r.id === id && r.index === index);
   const addDependencyRecord = (id: number, index?: number) => dependecy_records.push({ id, index });

   const retrig_par = createParameter(false);
   const ping_par = createParameter(false);

   const worker = createWorker<
      ({ kind: "dependency", id: number, action: Action } | { kind: "invalidate", index: number, invalidate_count: number }),
      { value: T, index: number, invalidate_count: number, dependencies_ids_and_indexes: Dependencies_ids_and_indexes }
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
            let index;

            for (index = 0; index < cache.count && maxQueueLength(); index++) {
               if (cache.isValid(index)) continue;
               const invalidate_count = cache.invalidateCount(index);

               global_effect_dependencies_stack.push(new Set());
               if (strategy === "ping") ping_par.get();
               const ret = executeWorker?.(index);

               const dependencies = global_effect_dependencies_stack.pop();
               const dependencies_ids_and_indexes = [...(dependencies ?? [])]
                  .map(({ dependency, index }) => ({ id: dependency.id, index }));

               postMessage({ value: ret, index, invalidate_count, dependencies_ids_and_indexes })

               if (ret !== undefined) cache.set(index, ret);

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
               retrig_par.set(!retrig_par.value)
               break;
            case "invalidate":
               const { index, invalidate_count } = data;
               cache.invalidate(index, invalidate_count);
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
         receive?.(value, index, invalidate_count, dependencies_ids_and_indexes);

         index_dependencies[index] = dependencies_ids_and_indexes;

         if (cache.invalidateCount(index) !== invalidate_count) {
            if (invalid_set) cache.invalidSet(index, value);
         } else cache.set(index, value);

         dependencies_ids_and_indexes.forEach(({ id, index, set_count }) => {
            const dep = global_dependencies.get(id);
            if (!dep) {
               console.warn("dependency not found", id, global_dependencies);
               return;
            }

            if (!dep.hasListener(onDepChange)) {
               onDepChange(dep, { key: "value", value: dep.get(), set_count: dep.setCount() });
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

         if (strategy === "ping") ping_par.set(!ping_par.value);
      },
   );

   const index_dependencies: Dependencies_ids_and_indexes[] = []

   function invalidate(index: number) {
      cache.invalidate(index)
      const invalidate_count = cache.invalidateCount(index);
      worker?.postMessage({ kind: "invalidate", index, invalidate_count });
   }

   function onDepChange(dependency: Dependency, action: Action) {

      const { id } = dependency;
      worker?.postMessage({ kind: "dependency", id, action });

      if (dependency === ping_par) return;

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