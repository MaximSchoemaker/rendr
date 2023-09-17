import { createEffect, type Component, onCleanup, createSignal, JSXElement, For, Index, untrack } from 'solid-js';

import logo from './logo.svg';
import styles from './App.module.css';
import Setup from "../sketches/sketch";
import { mod, clamp } from "../rendr/library/Utils.ts";

type Dependency = {
  // get: () => any;
  set: (value: any) => void;
  onChange: (callback: (value: any) => void) => void;
  unsubscribe: (callback: (value: any) => void) => void;
}

type Parameter = Dependency & {
  value: any;
}

type Cache = Dependency & {
  cache: ({
    status: "valid" | "invalid" | "pending",
    value: any
  })[]
}

type UI = {
  createTimeline: (
    frames: number,
    tick_par: Parameter,
    running_par: Parameter,
    caches: Cache[],
  ) => void;
}

const App: Component = () => {

  const [components, set_components] = createSignal<JSXElement[]>([]);

  function AddComponent(component: JSXElement) {
    set_components(components => [...components, component]);
  }

  const createUI = (callback: (ui: UI) => void) => {
    const ui: UI = {
      createTimeline: (frames, tick_par, running_par, caches) => {
        AddComponent(Timeline({ frames, tick_par, running_par, caches }));
      }
    }

    callback(ui);
  }

  createEffect(() => {
    // console.log("setup");
    const cleanup = Setup(createUI);
    // console.log(untrack(components));

    onCleanup(() => {
      // console.log("cleanup");
      cleanup();
      set_components([]);
    });
  });

  return (
    <div class={styles.App}>
      <div id="rendr" />
      <For each={components()}>{
        component => component
      }</For>
    </div>
  );
};

function createRendrSignal<T>(dependency: Dependency) {
  const _value = dependency.value ?? dependency.cache;
  const [value, set_value] = createSignal<T>(_value);

  createEffect(() => {

    function onChange() {
      const _value = dependency.value ?? dependency.cache;
      const new_value = typeof _value === 'object'
        ? Array.isArray(_value)
          ? [..._value]
          : { ..._value }
        : _value
      set_value(new_value);

      // console.log(...arguments);
      // if (arguments.length == 2) set_value(arguments[1]);
      // if (arguments.length == 3) set_value((cache) => {
      //   cache = [...cache]
      //   const [_, index, value] = arguments;
      //   cache[index] = { ...cache[index], value };
      //   return cache;
      // });
    }

    dependency.onChange(onChange);

    onCleanup(() => dependency.unsubscribe(onChange));
  });

  function setValue(new_value: any) {
    dependency.set(new_value);
  }

  return [value, setValue] as [typeof value, typeof setValue];
}

function createAnimationLoop(callback, running = false) {
  let animationFrame: number;
  const loop = () => {
    if (!ret.running) return
    callback();
    animationFrame = requestAnimationFrame(loop);
  }
  const ret = {
    running,
    stop() {
      this.running = false;
      cancelAnimationFrame(animationFrame);
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
    },
    set(running: boolean) {
      if (running !== this.running) this.toggle();
    }
  }
  if (running) ret.start();
  return ret;
}


type TimelineProps = {
  frames: number;
  tick_par: Parameter;
  running_par: Parameter;
  caches: Cache[];
}

function Timeline({ frames, tick_par, running_par, caches }: TimelineProps) {
  const [tick, set_tick] = createRendrSignal<number>(tick_par);
  const [running, set_running] = createRendrSignal<boolean>(running_par);

  function getActiveClass(tick: number, index: number) {
    return tick === index ? styles.active : ''
  }

  let shiftDown = false;

  const loop = createAnimationLoop(() => set_tick((tick() + 1) % frames));
  onCleanup(loop.stop);

  createEffect(() => loop.set(running()));

  let move = 0;
  let move_start_tick = 0;

  window.onkeydown = (evt) => {
    // console.log(evt.code);

    if (evt.code === 'Space') {
      set_running(!running());
    }

    if (evt.code === 'ArrowLeft') {
      tick_par.set(mod(tick() - 1, frames));
    }

    if (evt.code === 'ArrowRight') {
      tick_par.set(mod(tick() + 1, frames));
    }

    if (evt.code === "ShiftLeft" && !evt.repeat) {
      move = 0;
      move_start_tick = mod(tick(), frames);
      shiftDown = true;
      set_running(false);
    }
  };

  window.onkeyup = (evt) => {
    if (evt.code === "ShiftLeft")
      shiftDown = false;
  };

  window.onmousemove = (evt) => {
    if (shiftDown) {
      let _tick = mod(
        tick(),
        frames
      );
      // const { width } = display1.getBoundingClientRect();
      const width = window.innerWidth;
      const f = evt.movementX / width;
      const inc = f * frames;
      move += inc;

      _tick = clamp(Math.floor(move_start_tick + move), 0, frames - 1);
      set_tick(_tick);
    }
  };

  return (
    <div class={styles.timeline}>
      <div class={styles.rows}>

        <For each={caches}>{cache =>
          <TimelineRow cache={cache} tick={tick} />
        }</For>

        <div class={styles.cursorRow} >
          <Index each={Array(frames).fill(null)}>{(_, index) =>
            <div class={`${styles.cursor} ${getActiveClass(tick(), index)}`} />
          }</Index>
        </div>

      </div>
    </div>
  )
}

type TimelineRowProps = {
  cache: Cache
  tick: () => number
}

function TimelineRow({ cache: _cache, tick }: TimelineRowProps) {
  const [cache] = createRendrSignal<Cache["cache"]>(_cache);

  function getStatusClass(item?: Cache["cache"][0]) {
    return item ? styles[item.status] : '';
  }

  return (
    <div class={styles.row}>
      <Index each={cache()}>{(item, index) => {
        return <div class={`${styles.frame} ${getStatusClass(item())}`} />
      }
      }</Index>
    </div>
  )
}

export default App;
