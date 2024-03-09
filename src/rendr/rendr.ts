import { createSignal, onCleanup, untrack, Setter, Accessor, createReaction } from 'solid-js';
import { UI } from '../ui';
import { n_arr } from './utils';

export type Sketch = (render: Render, ui: UI) => void
export function createSketch(create: Sketch, options: RenderSettings) {
   return (render: Render, ui: UI) => {
      render.setSettings(options);
      create(render, ui);
   };
}

export function mountSketch(sketch: Sketch, ui: UI) {
   const render = createRender();
   sketch(render, ui);
   return render;
}

export function createCanvas(width: number, height: number) {
   const canvas = document.createElement('canvas');
   canvas.width = width;
   canvas.height = height;
   return canvas;
}

export function createOffscreenCanvas(width: number, height: number) {
   const canvas = new OffscreenCanvas(width, height);
   return canvas;
}

type Parameter<T> = {
   get: () => T,
   set: Setter<T>,
   signal: Accessor<T>,
}

export function createParameter<T>(initial_value: T): Parameter<T> {
   const [parameter, set_parameter] = createSignal<T>(initial_value, { equals: false });
   // const deferred_parameter = createDeferred(parameter, { timeoutMs: 1000 });
   return {
      get: () => parameter(),
      set: set_parameter,
      signal: parameter,
   }
}

type Cache<T> = {
   count: number,
   values: Parameter<T | undefined>[],
   getParameter: (index: number) => Parameter<T | undefined>,
   get: (index: number) => T | undefined,
   getLatest: (index: number) => T | undefined,
   set: (index: number, value: T | undefined) => void,
   valid: (index: number) => boolean,
}

export function createCache<T>(): Cache<T> {
   return {
      count: 0,
      values: [],
      getParameter(index) {
         if (!this.values[index]) {
            this.values[index] = createParameter<T | undefined>(undefined);
            this.count = Math.max(index + 1, this.count);
         }
         return this.values[index]
      },
      get(index) {
         return this.getParameter(index).get();
      },
      getLatest(index) {
         let value;
         do {
            value = this.get(index);
            index--;
         } while (value === undefined && index >= 0)
         return value;
      },
      set(index, value) {
         this.getParameter(index).set(() => value);
      },
      valid(index) {
         return this.get(index) === undefined;
      },
   }
}

export type Render = {
   update: <T>(
      initial_value: T,
      create: () => T,
      settings?: TaskSettings,
   ) => Parameter<T>,

   draw: (
      width: number,
      height: number,
      create: (
         view: CanvasRenderingContext2D,
         props: { width: number, height: number, size: number }
      ) => void,
      settings?: TaskSettings,
   ) => HTMLCanvasElement,

   construct: <T>(
      initial_value: T,
      max_steps: number,
      create: (
         value: T,
         props: { i: number, done: () => void }
      ) => T,
      settings?: TaskSettings,
   ) => Parameter<T>,

   generate: (
      width: number,
      height: number,
      max_steps: number,
      create: (
         view: CanvasRenderingContext2D,
         props: { width: number, height: number, size: number, i: number, max_steps: number, done: () => void }
      ) => void,
      settings?: TaskSettings,
   ) => HTMLCanvasElement,

   simulate: <T>(
      initial_value: T,
      max_steps: number,
      create: (
         value: T,
         props: { i: number, done: () => void }
      ) => T,
      settings?: TaskSettings,
   ) => Cache<T>,

   mountSketch: (sketch: Sketch, ui: UI) => void;

   execute: (max_time: number) => void,

   setSettings: (settings: RenderSettings) => void,

   scheduler: Scheduler,
}

type RenderSettings = {
   sync?: boolean;
}

export function createRender(): Render {
   const scheduler = createScheduler();

   return {
      update: (initial_value, create, settings) => {
         const parameter = createParameter(initial_value);

         scheduler.scheduleTask(() => {
            const new_value = create();
            parameter.set(() => new_value);
         }, settings);

         return parameter;
      },

      draw: (width, height, create, settings) => {
         const canvas = createCanvas(width, height);
         const ctx = canvas.getContext("2d")!;
         const size = Math.min(width, height);

         scheduler.scheduleTask(() => {
            ctx.clearRect(0, 0, width, height);
            create(ctx, { width, height, size })
         }, settings);

         return canvas;
      },

      construct: (initial_value, max_steps, create, settings) => {
         const parameter = createParameter(initial_value);

         scheduler.scheduleTaskQueue(max_steps, {
            reset: () => {
               parameter.set(() => structuredClone(initial_value));
            },
            execute: ({ i, done }) => {
               const prev_value = untrack(parameter.signal);
               const new_value = create(prev_value, { i, done });
               parameter.set(() => new_value);
            }
         }, settings);

         return parameter;
      },

      generate: (width, height, max_steps, create, settings) => {
         const canvas = createCanvas(width, height);
         const ctx = canvas.getContext("2d")!;
         const size = Math.min(width, height);

         scheduler.scheduleTaskQueue(max_steps, {
            reset: () => {
               ctx.clearRect(0, 0, width, height);
            },
            execute: ({ i, done }) => {
               create(ctx, { width, height, size, i, max_steps, done });
            }
         }, settings);

         return canvas;
      },

      simulate: (initial_value, max_steps, create, settings) => {
         const cache = createCache<typeof initial_value>();

         scheduler.scheduleTaskCache(max_steps, {
            reset: (index) => {
               cache.set(index, undefined);
            },
            execute: ({ i, done }) => {
               const prev_value = structuredClone(i == 0
                  ? initial_value
                  : cache.get(i - 1)
               );
               if (prev_value === undefined) return;
               const new_value = create(prev_value, { i, done });
               cache.set(i, new_value);
            }
         }, settings);

         return cache;
      },

      mountSketch: (sketch: Sketch, ui: UI) => {
         const render = mountSketch(sketch, ui);
         scheduler.scheduleScheduler(render.scheduler);
      },

      execute: (max_time) => {
         scheduler.execute(max_time);
      },

      scheduler,

      setSettings: (settings = {}) => {
         const { sync = false } = settings;
         scheduler.settings = { sync };
      }
   }
}

type SchedulerSettings = {
   sync?: boolean;
}

type Scheduler = {
   execute: (max_time: number) => void;
   scheduleTask: (execute: TaskExecute, settings?: TaskSettings) => void;
   scheduleTaskQueue: (max_time: number, callbacks: TaskQueueCallbacks, settings?: TaskSettings) => void;
   scheduleTaskCache: (max_time: number, callbacks: TaskCacheCallbacks, settings?: TaskSettings) => void;
   scheduleScheduler: (scheduler: Scheduler) => void;
   isDone: () => boolean;
   settings: SchedulerSettings;
}

function createScheduler(): Scheduler {
   const schedule: Task[] = [];
   let i = 0;

   const isDone = () => {
      return schedule.every(task => task.isDone());
   }

   return {
      settings: {
         sync: false,
      },
      execute(max_time) {

         let start_time = performance.now();
         const timeLeft = () => max_time - (performance.now() - start_time);

         while (timeLeft() > 0 && !isDone()) {
            let task_count = schedule.reduce((count, task) => count + (task.isDone() ? 0 : 1), 0);
            if (task_count == 0) return;

            const task = schedule[i];
            const sync = task.settings.sync ?? this.settings.sync;
            if (!sync) i = (i + 1) % schedule.length;
            if (task.isDone()) {
               if (sync) i = (i + 1) % schedule.length;
               continue;
            }

            const task_max_time = timeLeft() / (task_count);
            task.execute(task_max_time);
         }
      },
      scheduleTask(execute, settings) {
         const task = createTask(execute, settings);
         schedule.push(task);
      },
      scheduleTaskQueue(max_steps, callbacks, settings) {
         const taskQueue = createTaskQueue(max_steps, callbacks, settings);
         schedule.push(taskQueue);
      },
      scheduleTaskCache(max_steps, callbacks, settings) {
         const taskQueue = createTaskCache(max_steps, callbacks, settings);
         schedule.push(taskQueue);
      },
      scheduleScheduler(scheduler) {
         schedule.push(scheduler);
      },
      isDone,
   }
}

type Task = {
   settings: TaskSettings;
   execute: (max_time: number) => void;
   isDone: () => boolean;
}
type TaskExecute = () => void
type TaskSettings = {
   sync?: boolean;
}

function createTask(execute: TaskExecute, settings = {} as TaskSettings): Task {
   let is_done = false;

   const track = createReaction(invalidate);

   function invalidate() {
      is_done = false;
   }

   return {
      settings,
      execute: (max_time) => {
         track(() => {
            execute();
         });
         is_done = true;
      },
      isDone: () => {
         return is_done;
      }
   }
}

type TaskQueueCallbacks = {
   reset: () => void;
   execute: (props: { i: number, done: () => void }) => void;
}

function createTaskQueue(max_steps: number, callbacks: TaskQueueCallbacks, settings = {} as TaskSettings): Task {
   let i = 0;
   let is_done = false;
   const done = () => is_done = true;

   const track = createReaction(invalidate);

   function invalidate() {
      is_done = false;
      i = 0;
   }

   return {
      settings,
      execute: (max_time: number) => {

         const start_time = performance.now();
         if (i === 0) callbacks.reset();

         for (; i < max_steps && !is_done; i++) {
            track(() => callbacks.execute({ i, done }));

            const time = performance.now();
            const run_time = time - start_time;
            if (run_time > max_time) return;
         }
         is_done = true;

      },
      isDone: () => {
         return is_done;
      }
   }
}

type TaskCacheCallbacks = {
   reset: (index: number) => void;
   execute: (props: { i: number, done: () => void }) => void;
}

function createTaskCache(max_steps: number, callbacks: TaskCacheCallbacks, settings = {} as TaskSettings): Task {
   let is_done = false;
   const done = () => is_done = true;

   const valid = new Array(max_steps).fill(false);
   const tracks = n_arr(max_steps, i => createReaction(() => valid[i] = false));

   return {
      settings,
      execute: (max_time: number) => {
         const start_time = performance.now();
         for (let i = 0; i < max_steps && !is_done; i++) {
            if (valid[i]) continue;

            callbacks.reset(i);
            tracks[i](() => callbacks.execute({ i, done }));
            valid[i] = true;

            const time = performance.now();
            const run_time = time - start_time;
            if (run_time > max_time) return;
         }
         is_done = true;
      },
      isDone: () => {
         return is_done;
      }
   }
}

export function createAnimationLoop(callback: (delta: number) => void, running = true) {

   let animationFrame: number;
   let prev_time: number;
   const loop = (timestamp = 0) => {
      if (!ret.running) return
      animationFrame = requestAnimationFrame(loop);

      let delta = timestamp - prev_time;
      prev_time = timestamp;

      callback(delta);
   }

   const ret = {
      running,
      stop() {
         this.running = false;
         cancelAnimationFrame(animationFrame);
      },
      start() {
         this.running = true;
         prev_time = performance.now();
         animationFrame = requestAnimationFrame(loop);
         // loop(prev_time);
      },
      toggle() {
         if (this.running)
            this.stop();
         else
            this.start();
      },
      set(running: boolean) {
         if (running !== this.running) this.toggle();
      }
   }

   if (running) ret.start();
   onCleanup(() => ret.stop());

   return ret;
}

export function createLoop(callback: (delta: number) => void, interval = 0, running = true) {

   let timeout: number;
   let prev_time: number;
   const loop = () => {
      if (!ret.running) return
      timeout = setTimeout(loop, interval);

      let timestamp = performance.now();
      let delta = timestamp - prev_time;
      prev_time = timestamp;

      callback(delta);
   }

   const ret = {
      running,
      stop() {
         this.running = false;
         clearTimeout(timeout);
      },
      start() {
         this.running = true;
         prev_time = performance.now();
         timeout = setTimeout(loop, interval);
      },
      toggle() {
         if (this.running)
            this.stop();
         else
            this.start();
      },
      set(running: boolean) {
         if (running !== this.running) this.toggle();
      }
   }

   if (running) ret.start();
   onCleanup(() => ret.stop());

   return ret;
}