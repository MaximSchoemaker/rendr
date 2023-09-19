import { createEffect, onCleanup, createSignal, JSXElement, For, Index, Show } from 'solid-js';

import styles from './App.module.css';
import Setup from "../sketches/sketch";
import { mod, clamp } from "../rendr/library/Utils";

type Dependency = {
  set: (value: any) => void;
  onChange: (callback: (value: any) => void) => void;
  unsubscribe: (callback: (value: any) => void) => void;
}

type Parameter<T> = Dependency & {
  value: T;
}

type Cache<T> = Dependency & {
  cache: ({
    status: "valid" | "invalid" | "pending",
    value: T
  })[]
  getLatest: (index: number) => T,
  getLatestValid: (index: number) => T,
}

class UI {
  AddComponent;
  constructor(AddComponent: (component: JSXElement) => void) {
    this.AddComponent = AddComponent;
  }
  createTimeline(frames: number, tick_par: Parameter<number>, running_par: Parameter<boolean>, caches: Cache<any>[]) {
    this.AddComponent(Timeline({ frames, tick_par, running_par, caches }));
  }
  createView(frame_par: Parameter<ImageBitmap>) {
    this.AddComponent(View({ frame_par }));
  }
  createCacheView(tick_par: Parameter<number>, running_par: Parameter<boolean>, frame_cache: Cache<ImageBitmap>) {
    this.AddComponent(CacheView({ tick_par, running_par, frame_cache }));
  }
  createContainer(callback: (ui: UI) => void) {
    this.AddComponent(Container({ callback }));
  }
}

const App = () => {

  const [components, set_components] = createSignal<JSXElement[]>([]);

  function AddComponent(component: JSXElement) {
    set_components(components => [...components, component]);
  }

  const createUI = (callback: (ui: UI) => void) => {
    const ui = new UI(AddComponent);
    callback(ui);
  }

  const cleanup = Setup(createUI);
  cleanup && onCleanup(cleanup);

  return (
    <div class={styles.App}>
      <For each={components()}>{
        component => component
      }</For>
    </div>
  );
};

type ContainerProps = {
  callback: (ui: UI) => void;
}

const Container = ({ callback }: ContainerProps) => {

  const [components, set_components] = createSignal<JSXElement[]>([]);

  function AddComponent(component: JSXElement) {
    set_components(components => [...components, component]);
  }

  const ui = new UI(AddComponent);
  callback(ui);

  const stored_selected = JSON.parse(localStorage.getItem("selected") ?? "null");
  const [selected, set_selected] = createSignal<number | null>(stored_selected);
  createEffect(() => {
    localStorage.setItem("selected", JSON.stringify(selected()))
  });

  function clickComponent(component: JSXElement, i: () => number | null) {
    (component as HTMLElement).onclick = () =>
      set_selected(selected => selected === null ? i() : null);
    return component;
  }

  return (
    <div class={styles.Container}>
      <Show when={selected() === null} fallback={clickComponent(components()[selected()!], selected)}>
        <For each={components()}>{clickComponent}</For>
      </Show>
    </div>
  );
};

type TimelineProps = {
  frames: number;
  tick_par: Parameter<number>;
  running_par: Parameter<boolean>;
  caches: Cache<any>[];
}

function Timeline({ frames, tick_par, running_par, caches }: TimelineProps) {
  const [tick, set_tick] = createRendrParameterSignal<number>(tick_par);
  const [running, set_running] = createRendrParameterSignal<boolean>(running_par);

  function getActiveClass(tick: number, index: number) {
    return tick === index ? styles.active : ''
  }

  let shiftDown = false;

  const loop = createAnimationLoop(() => {
    set_tick((tick() + 1) % frames)
    if (running()) {
      move = 0;
      move_start_tick = mod(tick(), frames);
    }
  });
  onCleanup(loop.stop);

  createEffect(() => loop.set(running()));

  let move = 0;
  let move_start_tick = tick();

  function onStartScrub() {
    move = 0;
    move_start_tick = mod(tick(), frames);
    shiftDown = true;
  }

  function onStopScrub() {
    shiftDown = false;
  }

  window.onkeydown = (evt) => {
    // console.log(evt.code);

    if (evt.code === 'Space')
      set_running(!running());

    if (evt.code === 'ArrowLeft')
      tick_par.set(mod(tick() - 1, frames));

    if (evt.code === 'ArrowRight')
      tick_par.set(mod(tick() + 1, frames));

    if (evt.code === "ShiftLeft" && !evt.repeat) {
      set_running(false);
      onStartScrub();
    }
  };

  window.onkeyup = (evt) => {
    if (evt.code === "ShiftLeft")
      onStopScrub()
  };

  let el: HTMLDivElement;
  createEffect(() => {
    el.onpointerdown = (evt) => {
      evt.preventDefault();
      onStartScrub();
    }

    el.onclick = () => {
      if (move === 0) set_running(!running());
    }
  });

  window.onpointerup = () => {
    onStopScrub()
  }

  window.onpointermove = (evt) => {
    if (shiftDown) {
      set_running(false);

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
    <div class={styles.Timeline} ref={ref => el = ref}>
      <div class={styles.rows}>

        <For each={caches}>{cache =>
          <Row cache={cache} />
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

type RowProps = {
  cache: Cache<any>
}

function Row({ cache: _cache }: RowProps) {
  const [cache] = createRendrCacheSignal<Cache<any>["cache"]>(_cache);

  function getStatusClass(item?: Cache<any>["cache"][0]) {
    return item ? styles[item.status] : '';
  }

  return (
    <div class={styles.Row}>
      <Index each={cache()}>{(item, index) => {
        return <div class={`${styles.frame} ${getStatusClass(item())}`} />
      }
      }</Index>
    </div>
  )
}

type ViewProps = {
  frame_par: Parameter<ImageBitmap>;
}

function View({ frame_par }: ViewProps) {
  const [frame] = createRendrParameterSignal<ImageBitmap>(frame_par);

  let el: HTMLCanvasElement;
  createEffect(() => {
    const bitmap = frame();
    if (!bitmap) return;

    el.width = bitmap.width;
    el.height = bitmap.height;

    const ctx = el.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(bitmap, 0, 0);
  });

  return (
    <canvas
      class={styles.View}
      ref={(ref) => el = ref}
      width={1080}
      height={1080}
    />
  );
}

type CacheViewProps = {
  tick_par: Parameter<number>;
  running_par: Parameter<boolean>;
  frame_cache: Cache<ImageBitmap>;
}

function CacheView({ tick_par, running_par, frame_cache }: CacheViewProps) {
  const [tick] = createRendrParameterSignal<number>(tick_par);
  const [running] = createRendrParameterSignal<boolean>(running_par);
  const [cache] = createRendrCacheSignal<ImageBitmap>(frame_cache);

  let el: HTMLCanvasElement;
  createEffect(() => {
    cache();

    const bitmap = running()
      ? frame_cache.getLatestValid(tick())
      : frame_cache.getLatest(tick());

    if (!bitmap) return;

    el.width = bitmap.width;
    el.height = bitmap.height;

    const ctx = el.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(bitmap, 0, 0);
  });

  return (
    <canvas
      class={styles.View}
      ref={(ref) => el = ref}
      width={1080}
      height={1080}
    />
  );
}


function createRendrParameterSignal<T>(dependency: Parameter<T>) {
  const _value = dependency.value;
  const [value, set_value] = createSignal<T>(_value);

  createEffect(() => {

    function onChange() {
      set_value(() => dependency.value);
    }

    dependency.onChange(onChange);

    onCleanup(() => dependency.unsubscribe(onChange));
  });

  function setValue(new_value: any) {
    dependency.set(new_value);
  }

  return [value, setValue] as [typeof value, typeof setValue];
}

function createRendrCacheSignal<T>(dependency: Cache<T>) {
  const _value = dependency.cache;
  const [value, set_value] = createSignal<Cache<T>["cache"]>(_value);

  createEffect(() => {

    function onChange() {
      const _value = dependency.cache;
      const new_value = _value.map(v => ({ ...v }));
      set_value(new_value);

      // console.log(...arguments);
      // if (arguments.length == 2) set_value(arguments[1]);
      // if (arguments.length == 3) set_value((cache) => {
      //   cache = [...cache]
      //   const [_, index, value] = arguments;
      //   cache[index] = { ...cache[index], value };
      //   // console.log(cache);
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

function createAnimationLoop(callback: () => void, running = false) {
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

export default App;
