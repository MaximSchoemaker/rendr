import { createSignal, onCleanup, untrack, Setter, Accessor, createReaction } from 'solid-js';
import { UI } from '../UI';
import { mod, n_arr } from './utils';
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_VERY_HIGH } from 'mediabunny';

export class ParameterUndefinedError extends Error {
   constructor() {
      super(
         `Parameter is undefied`,
      );
      this.name = 'ParameterUndefinedError';
   }
}


export type Sketch<T> = (engine: Engine, ui: UI, props: T) => void
export function createSketch<T>(create: Sketch<T>, settings?: SchedulerSettings): Sketch<T> {
   return (engine, ui, props) => {
      engine.scheduler.settings = { ...engine.scheduler.settings, ...settings };
      create(engine, ui, props);
   };
}

export function mount<T>(sketch: Sketch<T>, ui: UI, props?: T) {
   const engine = createEngine();
   sketch(engine, ui, props ?? {} as T);
   return engine;
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

type getSettings = { dont_track?: boolean }

export type Parameter<T> = {
   get: (settings?: getSettings) => T,
   getSafe: (settings?: getSettings) => T | undefined,
   set: Setter<T>,
   signal: Accessor<T>,
}

export function createParameter<T>(initial_value: T): Parameter<T> {
   const [parameter, set_parameter] = createSignal<T>(initial_value, { equals: false });
   // const deferred_parameter = createDeferred(parameter, { timeoutMs: 1000 });
   return {
      get(settings) {
         const value = this.getSafe(settings);
         if (value === undefined) throw new ParameterUndefinedError();
         return value;
      },
      getSafe(settings) {
         const value = !settings?.dont_track
            ? parameter()
            : untrack(parameter);
         return value;
      },
      set: set_parameter,
      signal: parameter,
   }
}

export type Cache<T> = {
   count: number,
   values: (Parameter<T> | undefined)[],
   get: ((index: number, settings?: getSettings) => T)
   getSafe: ((index: number, settings?: getSettings) => T | undefined)
   getLatest: (index: number, settings?: getSettings) => T,
   getLatestSafe: (index: number, settings?: getSettings) => T | undefined,
   set: (index: number, value: T) => void,
   delete(index: number): void,
   valid: (index: number) => boolean,
}

export function createCache<T>(): Cache<T> {
   return {
      count: 0,
      values: [] as (Parameter<T>)[],

      get(index: number, settings?: getSettings) {
         const parameter = this.values[index];
         if (parameter) return parameter.get(settings);
         throw new ParameterUndefinedError();
      },
      getSafe(index: number, settings?: getSettings) {
         const parameter = this.values[index];
         if (parameter) return parameter.getSafe(settings);
      },
      getLatest(index: number, settings?: getSettings) {
         const value = this.getLatestSafe(index, settings);
         if (value === undefined) throw new ParameterUndefinedError();
         return value;
      },
      getLatestSafe(index: number, settings?: getSettings) {
         this.count = Math.max(index + 1, this.count);
         for (let n = 0; n < this.count; n++) {
            const i = mod(index - n, this.count);
            if (this.valid(i)) return this.get(i, settings);
         }
      },
      set(index, value) {
         const parameter = this.values[index];
         if (!parameter) {
            this.values[index] = createParameter(value);
            this.count = Math.max(index + 1, this.count);
         } else {
            parameter.set(() => value);
         }
      },
      delete(index) {
         delete this.values[index];
      },
      valid(index) {
         return this.getSafe(index) !== undefined;
      },
   }
}

export type ConstructProps = { index: number, done: () => void }
export type SimulateProps = { index: number, done: () => void }

export type DrawProps = { width: number, height: number }
export type GenerateProps = { width: number, height: number, index: number, max_steps: number, done: () => void }
export type AnimateProps = { width: number, height: number, index: number, max_steps: number, done: () => void }
export type VideoProps = { width: number, height: number, index: number, max_steps: number, done: () => void }

export type Engine = {
   update: <T>(
      initial_value: T,
      create: (value: T) => T | void,
      settings?: TaskSettings,
   ) => Parameter<T>,

   construct: <T>(
      initial_value: T,
      max_steps: number,
      create: (
         value: T,
         props: ConstructProps
      ) => T | void,
      settings?: TaskSettings,
   ) => Parameter<T>,

   simulate: <T>(
      initial_value: T,
      max_steps: number,
      create: (
         value: T,
         props: SimulateProps
      ) => T | void,
      settings?: TaskSettings,
   ) => Cache<T>,

   draw: (
      width: number,
      height: number,
      create: (
         ctx: CanvasRenderingContext2D,
         props: DrawProps
      ) => void,
      settings?: TaskSettings,
   ) => HTMLCanvasElement,

   generate: (
      width: number,
      height: number,
      max_steps: number,
      create: (
         ctx: CanvasRenderingContext2D,
         props: GenerateProps
      ) => void,
      settings?: TaskSettings,
   ) => HTMLCanvasElement,

   animate: (
      width: number,
      height: number,
      max_steps: number,
      create: (
         ctx: CanvasRenderingContext2D,
         props: AnimateProps
      ) => void,
      settings?: TaskSettings,
   ) => Cache<HTMLCanvasElement>,

   video: (
      fps: number,
      width: number,
      height: number,
      max_steps: number,
      create: (
         ctx: CanvasRenderingContext2D,
         props: VideoProps
      ) => void,
      settings?: TaskSettings,
   ) => HTMLVideoElement,

   mount: <T>(sketch: Sketch<T>, ui: UI, props: T) => Engine;

   scheduler: Scheduler,
}

export function createEngine(): Engine {
   const scheduler = createScheduler();

   return {
      scheduler,

      update: (initial_value, create, settings) => {
         const parameter = createParameter(initial_value);

         scheduler.schedule(createTask(() => {
            const value = untrack(parameter.signal);
            const new_value = create(value);
            parameter.set(() => new_value ?? value);
         }, settings));

         return parameter;
      },

      construct: (initial_value, max_steps, create, settings) => {
         const parameter = createParameter(initial_value);

         scheduler.schedule(createTaskQueue(max_steps, {
            reset: () => {
               parameter.set(() => structuredClone(initial_value));
            },
            execute: ({ index, done }) => {
               const prev_value = untrack(parameter.signal);
               const new_value = create(prev_value, { index, done });
               parameter.set(() => new_value ?? prev_value);
            }
         }, settings));

         return parameter;
      },

      simulate: (initial_value, max_steps, create, settings) => {
         const cache = createCache<typeof initial_value>();

         scheduler.schedule(createTaskCache(max_steps, {
            reset: (index) => {
               cache.delete(index);
            },
            execute: ({ index, done }) => {
               const prev_value = structuredClone(index == 0
                  ? initial_value
                  : cache.get(index - 1)
               );
               if (prev_value === undefined) return;
               const new_value = create(prev_value, { index, done });
               cache.set(index, new_value ?? prev_value);
            }
         }, settings));

         return cache;
      },

      draw: (width, height, create, settings) => {
         const canvas = createCanvas(width, height);
         const ctx = canvas.getContext("2d")!;

         scheduler.schedule(createTask(() => {
            ctx.clearRect(0, 0, width, height);
            create(ctx, { width, height })
         }, settings));

         return canvas;
      },

      generate: (width, height, max_steps, create, settings) => {
         const canvas = createCanvas(width, height);
         const ctx = canvas.getContext("2d")!;

         scheduler.schedule(createTaskQueue(max_steps, {
            reset: () => {
               ctx.clearRect(0, 0, width, height);
            },
            execute: ({ index, done }) => {
               create(ctx, { width, height, index, max_steps, done });
            }
         }, settings));

         return canvas;
      },

      animate: (width, height, max_steps, create, settings) => {
         const cache = createCache<HTMLCanvasElement>();

         scheduler.schedule(createTaskCache(max_steps, {
            reset: (index) => {
               cache.delete(index);
            },
            execute: ({ index, done }) => {
               const canvas = cache.getSafe(index, { dont_track: true }) ?? createCanvas(width, height);
               const ctx = canvas.getContext("2d")!;
               ctx.clearRect(0, 0, width, height);
               create(ctx, { width, height, index, max_steps, done });
               cache.set(index, canvas);
            }
         }, settings));

         return cache;
      },

      video: (fps, width, height, max_steps, create, settings) => {
         const video = document.createElement('video');

         const canvas = createCanvas(width, height);
         const ctx = canvas.getContext("2d")!;

         const output = new Output({
            format: new Mp4OutputFormat(),
            target: new BufferTarget(), // Writing to memory
         });

         // Add a video track backed by a canvas element
         const canvasSource = new CanvasSource(canvas, {
            codec: 'avc',
            bitrate: QUALITY_VERY_HIGH,
         });

         output.addVideoTrack(canvasSource);
         output.start().catch(err => console.error("Error starting output:", err));

         scheduler.schedule(createTaskQueue(max_steps, {
            reset: () => {
               // TODO: reset video recording
            },
            execute: ({ index, done }) => {
               if (output.state !== 'started') throw new Error("Output not started. Output state: " + output.state);

               ctx.clearRect(0, 0, width, height);
               create(ctx, { width, height, index, max_steps, done });

               canvasSource.add(index / fps)
                  .catch(err => console.error("Error adding frame:", err));
            },
            done: () => {
               console.log("finalizing video...");
               output.finalize().then(() => {
                  console.log("video finalized");

                  const buffer = output.target.buffer; // Final MP4 file
                  if (!buffer) throw new Error("No video buffer generated");
                  const blob = new Blob([buffer], { type: 'video/mp4' });
                  const url = URL.createObjectURL(blob);
                  video.src = url;
               });
            }
         }, settings));



         video.autoplay = true;
         video.loop = true;
         video.muted = true;
         video.controls = true;
         video.width = width;
         video.height = height;

         return video;
      },

      // video: (width, height, max_steps, create, settings) => {
      //    // const cache = createCache<HTMLCanvasElement>();
      //    const canvas = createCanvas(width, height);
      //    const ctx = canvas.getContext("2d")!;
      //    // const chunks: BlobPart[] = [];
      //    const stream = canvas.captureStream(0);
      //    const track = stream.getTracks()[0] as CanvasCaptureMediaStreamTrack
      //    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
      //    const video = document.createElement('video');

      //    // recorder to video
      //    const chunks: BlobPart[] = [];
      //    recorder.ondataavailable = (e) => {
      //       console.log(recorder.state);
      //       if (e.data.size > 0) {
      //          chunks.push(e.data);
      //       }

      //       if (recorder.state === "inactive") {
      //          const blob = new Blob(chunks, { type: 'video/webm' });
      //          const url = URL.createObjectURL(blob);
      //          video.src = url;
      //       }
      //    }
      //    recorder.start();

      //    const size = Math.min(width, height);

      //    scheduler.schedule(createTaskCache(max_steps, {
      //       reset: (index) => {
      //          // cache.set(index, undefined);
      //          // TODO: reset video recording
      //       },
      //       execute: ({ index, done }) => {
      //          ctx.clearRect(0, 0, width, height);
      //          create(ctx, { width, height, size, index: index, max_steps, done });
      //          // cache.set(index, canvas);
      //          track.requestFrame();

      //          if (index === max_steps - 1) {
      //             recorder.stop();
      //          }
      //       }
      //    }, settings));

      //    video.autoplay = true;
      //    video.loop = true;
      //    video.muted = true;
      //    video.controls = true;

      //    return video;
      // },

      mount: <T>(sketch: Sketch<T>, ui: UI, props: T) => {
         const engine = mount(sketch, ui, props);
         scheduler.schedule(engine.scheduler);
         return engine;
      },
   }
}



type SchedulerSettings = {
   sync?: boolean;
}

type Scheduler = Task & {
   tasks: Task[];
   settings: SchedulerSettings;
   schedule: (task: Task) => void;
}

function createScheduler() {
   let index = 0;

   const scheduler: Scheduler = {
      tasks: [],
      run_time: 0,
      settings: {
         sync: false,
      },

      execute(max_time) {

         let start_time = performance.now();
         const timeLeft = () => max_time - (performance.now() - start_time);

         while (timeLeft() > 0 && !this.isDone()) {
            let task_count = this.tasks.reduce((count, task) => count + (task.isDone() ? 0 : 1), 0);
            if (task_count == 0) return;

            const task = this.tasks[index];
            if (task.isErrored()) continue;

            const sync = task.settings.sync ?? this.settings.sync;
            if (!sync) index = (index + 1) % this.tasks.length;
            if (task.isDone()) {
               if (sync) index = (index + 1) % this.tasks.length;
               continue;
            }

            const task_max_time = timeLeft() / (task_count);
            const task_start_time = performance.now();
            task.execute(task_max_time);
            const task_time = performance.now() - task_start_time;
            task.run_time += task_time;
         }
      },

      schedule(task) {
         this.tasks.push(task);
      },

      isDone() {
         return this.tasks.every(task => task.isDone());
      },

      isErrored() {
         return false; // TODO: figure out if scheduler can meaningfully be errored?
      },

      progress() {
         const total_progress = this.tasks.reduce((tot, task) => tot + task.progress(), 0);
         const progress = total_progress / this.tasks.length;
         return progress;
      }
   }

   onCleanup(() => { scheduler.tasks = []; });

   return scheduler;
}

function handleTaskError(err: any) {
   if (err instanceof ParameterUndefinedError) {
      console.warn("tried to get and undefined paramter");
      // Silently ignore parameter undefined errors in tasks
      return;
   }
   throw err;
}

export type Task = {
   settings: TaskSettings;
   run_time: number;
   execute: (max_time: number) => void;
   isDone: () => boolean;
   isErrored: () => boolean;
   progress: () => number;
}
type TaskExecute = () => void
type TaskSettings = {
   sync?: boolean;
}

function createTask(execute: TaskExecute, settings = {} as TaskSettings): Task {
   let is_done = false;
   let is_errored = false;

   const track = createReaction(() => is_done = false);

   return {
      settings,
      run_time: 0,
      execute: () => {
         try {
            try {
               track(() => execute());
               is_done = true;
            } catch (err) {
               handleTaskError(err);
            }
         } catch (err) {
            console.error(err);
            console.warn("❌ Errored task will stop executing :(");
            is_errored = true;
         }
      },
      isDone: () => {
         return is_done;
      },
      isErrored: () => {
         return is_errored;
      },
      progress: () => {
         return is_done ? 1 : 0;
      }
   }
}

type TaskQueueCallbacks = {
   reset: () => void;
   execute: (props: { index: number, done: () => void }) => void;
   done?: () => void;
}

function createTaskQueue(max_steps: number, callbacks: TaskQueueCallbacks, settings = {} as TaskSettings): Task {
   let index = 0;
   let is_done = false;
   let is_errored = false;
   const done = () => is_done = true;

   const track = createReaction(() => {
      index = 0;
      is_done = false;
   });

   return {
      settings,
      run_time: 0,
      execute: (max_time: number) => {
         try {
            const start_time = performance.now();
            for (; index < max_steps; index++) {
               if (is_done) return;
               if (performance.now() - start_time > max_time) return;

               if (index === 0) callbacks.reset();
               let failed = false;
               track(() => {
                  try {
                     callbacks.execute({ index, done })
                  } catch (err) {
                     failed = true;
                     handleTaskError(err);
                  }
               });
               if (failed) return;
            }

            is_done = true;
            callbacks.done?.();
         } catch (err) {
            console.error(err);
            console.warn("❌ Errored task will stop executing :(");
            is_errored = true;
         }
      },
      isDone: () => {
         return is_done;
      },
      isErrored: () => {
         return is_errored;
      },
      progress: () => {
         return is_done ? 1 : index / max_steps;
      }
   }
}

type TaskCacheCallbacks = {
   reset: (index: number) => void;
   execute: (props: { index: number, done: () => void }) => void;
}

function createTaskCache(max_steps: number, callbacks: TaskCacheCallbacks, settings = {} as TaskSettings): Task {
   let is_done = false;
   let is_errored = false;
   const done = () => is_done = true;

   const valid = new Array(max_steps).fill(false);
   let valid_count = 0;

   const tracks = n_arr(max_steps, i => createReaction(() => {
      is_done = false;
      if (valid[i]) {
         valid[i] = false
         valid_count--;
         callbacks.reset(i);
      }
   }));

   return {
      settings,
      run_time: 0,
      execute: (max_time: number) => {
         try {
            const start_time = performance.now();
            for (let index = 0; index < max_steps; index++) {
               if (is_done) return;
               if (valid[index]) continue;
               if (performance.now() - start_time > max_time) return;

               let failed = false;
               tracks[index](() => {
                  try {
                     callbacks.execute({ index, done })
                  } catch (err) {
                     failed = true;
                     handleTaskError(err);
                  }
               });
               if (failed) continue;

               valid[index] = true;
               valid_count++;
            }

            is_done = valid_count === max_steps;
         } catch (err) {
            console.error(err);
            console.warn("❌ Errored task will stop executing :(");
            is_errored = true;
         }
      },
      isDone: () => {
         return is_done;
      },
      isErrored: () => {
         return is_errored;
      },
      progress: () => {
         return is_done ? 1 : valid_count / max_steps;
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