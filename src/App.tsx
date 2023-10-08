import { createEffect, onCleanup, createSignal, JSXElement, For, Index, Show, untrack } from 'solid-js';
import { createStore } from "solid-js/store";

import styles from './App.module.css'; // @ts-ignore
import Setup from "../sketches/sketch";
import { mod, clamp, floorTo } from "../rendr/library/Utils";
import { Action, Cache, Dependency, Parameter } from '../rendr/rendr';

class UI {
  AddComponent;
  constructor(AddComponent: (component: JSXElement) => void) {
    this.AddComponent = AddComponent;
  }
  createContainer(callback: (ui: UI) => void) {
    this.AddComponent(Container({ callback }));
  }
  createViewContainer(callback: (ui: UI) => void) {
    this.AddComponent(ViewContainer({ callback }));
  }
  createWindow(callback: (ui: UI) => void) {
    this.AddComponent(Window({ callback }));
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
  createParameterNumber(name: string, parameter: Parameter<number>, options: ParameterNumberOptions) {
    this.AddComponent(ParameterNumber({ name, parameter, options }));
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

  return (
    <div class={styles.Container}>
      <For each={components()}>{component => component}</For>
    </div>
  );
};


type ViewContainerProps = {
  callback: (ui: UI) => void;
}

const ViewContainer = ({ callback }: ViewContainerProps) => {

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

  function getSelectedComponent() {
    const index = Math.min(components().length - 1, selected()!);
    return components()[index];
  }

  return (
    <div class={styles.ViewContainer}>
      <Show when={components().length > 0}>
        <Show when={selected() === null} fallback={clickComponent(getSelectedComponent(), selected)}>
          <For each={components()}>{clickComponent}</For>
        </Show>
      </Show>
    </div>
  );
};

type WindowProps = {
  callback: (ui: UI) => void;
}

const Window = ({ callback }: WindowProps) => {

  const [components, set_components] = createSignal<JSXElement[]>([]);

  function AddComponent(component: JSXElement) {
    set_components(components => [...components, component]);
  }

  const ui = new UI(AddComponent);
  callback(ui);

  return (
    <div class={styles.Window}>
      <For each={components()}>{
        component => component
      }</For>
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
  }, false);
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

  function hasFocus() {
    return document.activeElement === document.body;
  }

  window.onkeydown = (evt) => {
    // console.log(evt.code);
    if (!hasFocus()) return;

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
      evt.preventDefault(); // @ts-ignore
      document.activeElement?.blur();
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
    if (!hasFocus()) return;

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
    <div
      ref={ref => el = ref}
      class={styles.Timeline}
    >
      <div class={styles.rows}>

        <div class={styles.cursorRow} >
          <Index each={Array(frames).fill(null)}>{(_, index) =>
            <div class={`${styles.cursor} ${getActiveClass(tick(), index)}`} />
          }</Index>
        </div>

        <For each={caches}>{cache =>
          <Row cache={cache} />
        }</For>

      </div>
    </div>
  )
}

type RowProps = {
  cache: Cache<any>
}

function Row({ cache: rendr_cache }: RowProps) {
  const [cache] = createRendrCacheStore<Cache<any>["value"]>(rendr_cache);

  return (
    <div class={styles.Row}>
      <Index each={cache}>{(item, i) =>
        <Frame item={item()} index={i} rendr_cache={rendr_cache} />
      }</Index>
      {/* <For each={cache}>{(item, i) =>
        <Frame item={item} index={i} rendr_cache={rendr_cache} />
      }</For> */}
    </div>
  )
}

type FrameProps = {
  item: Cache<any>["value"][0];
  index: number;
  rendr_cache: Cache<any>;
}

function Frame(props: FrameProps) {

  let el: HTMLDivElement;
  let resetting = false;
  function resetAnimation() {
    if (!el || resetting) return;
    resetting = true;
    el.style.setProperty("animation-name", "none");
    setTimeout(() => {
      el.style.setProperty("animation-name", styles["fade-out"])
      resetting = false
    });
  }

  props.rendr_cache.onMutate({ index: props.index, key: "valid" }, resetAnimation);
  props.rendr_cache.onMutate({ index: props.index, key: "value" }, resetAnimation);
  // props.rendr_cache.onChangeValid(onChange);
  onCleanup(() => props.rendr_cache.unsubscribe(resetAnimation));

  function getStatusClass() {
    // console.log(props.item);
    if (!props.item) return '';
    const status = props.item.valid ? "valid" : "invalid";
    return styles[status];
  }

  return (
    <div
      class={`${styles.frame} ${getStatusClass()}`}
    >
      {/* <div class={styles.flash} ref={ref => el = ref} /> */}
      <div class={styles.frameTooltip}>{props.item?.value?.length}</div>
    </div>
  );
}

type ViewProps = {
  frame_par: Parameter<ImageBitmap>;
}

function View({ frame_par }: ViewProps) {
  const [frame] = createRendrParameterSignal<ImageBitmap>(frame_par);

  let el: HTMLCanvasElement;
  createEffect(() => {
    const ctx = el.getContext('2d');
    const bitmap = frame();

    if (!bitmap) {
      ctx?.clearRect(0, 0, el.width, el.height);
      return;
    }

    el.width = bitmap.width;
    el.height = bitmap.height;

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
  // const [cache] = createRendrCacheSignal<ImageBitmap>(frame_cache);

  let el: HTMLCanvasElement;
  let prev_bitmap: ImageBitmap;
  const loop = createAnimationLoop(() => {

    const request_index = running() ? 0 : tick();
    frame_cache.request(request_index);

    let bitmap = frame_cache.getLatestValid(tick());
    bitmap ??= frame_cache.get(request_index);

    if (!bitmap || bitmap === prev_bitmap) return;

    el.width = bitmap.width;
    el.height = bitmap.height;

    const ctx = el.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(bitmap, 0, 0);
    prev_bitmap = bitmap;
  });
  onCleanup(loop.stop);

  return (
    <canvas
      class={styles.View}
      ref={(ref) => el = ref}
      width={1080}
      height={1080}
    />
  );
}

type ParameterNumberOptions = {
  min?: number;
  max?: number;
  step?: number;
  range?: number;
}

type ParameterNumberProps = {
  name: string;
  parameter: Parameter<number>;
  options: ParameterNumberOptions;
}

function ParameterNumber({ name, parameter, options = {} }: ParameterNumberProps) {
  const [value, set_value] = createRendrParameterSignal<number>(parameter);

  let scrubbing = false;
  let move = 0;
  let move_start_value = value();

  const { min, max } = options;

  let range = options.range ?? value();
  if (min === undefined && max !== undefined) range = max
  if (min !== undefined && max !== undefined) range = max - min;

  const step = options.step ?? range / 100;

  const progress = () => {
    return (min !== undefined && max !== undefined)
      ? clamp((value() - min) / range)
      : 0;
  }
  const readonly = () => min !== undefined && max !== undefined
    ? isMobile()
    : false;

  let el: HTMLDivElement;
  let input_el: HTMLInputElement;
  let scrub_type: "pointer" | "shift" = "shift";

  function onStartScrub(type: "pointer" | "shift") {
    move = 0;
    move_start_value = value();
    scrubbing = true;
    scrub_type = type;
  }

  function onStopScrub() {
    scrubbing = false;
  }

  function hasFocus() {
    return document.activeElement === input_el;
  }

  function updateValue(new_value: number) {
    if (step !== undefined) new_value = floorTo(new_value, step);
    if (min !== undefined && max === undefined) new_value = Math.max(new_value, min);
    if (min === undefined && max !== undefined) new_value = Math.min(new_value, max);
    if (min !== undefined && max !== undefined) new_value = clamp(new_value, min, max);
    set_value(new_value);
  }

  createEffect(() => {
    function onKeyDown(evt: KeyboardEvent) {
      if (!hasFocus()) return;

      // console.log(evt.code);
      if (evt.code === 'ArrowLeft' && evt.ctrlKey)
        updateValue(untrack(value) - step);
      if (evt.code === 'ArrowRight' && evt.ctrlKey)
        updateValue(untrack(value) + step);

      if (evt.code === "ShiftLeft" && !evt.repeat) {
        onStartScrub("shift");
      }
    }
    function onKeyUp(evt: KeyboardEvent) {
      if (evt.code === "ShiftLeft")
        onStopScrub()
    }
    function onPointerDown(evt: PointerEvent) {
      if (evt.target !== input_el) {
        evt.preventDefault();
        input_el.focus();
      }
      onStartScrub("pointer");
    }
    function onPointerUp(evt: PointerEvent) {
      onStopScrub()
    }
    function onPointerMove(evt: PointerEvent) {
      if (!hasFocus()) return;
      if (scrubbing) {

        const width = ({
          shift: window.innerWidth,
          pointer: el.getBoundingClientRect().width,
        })[scrub_type];

        const f = evt.movementX / width;
        const inc = f * range;
        move += inc;

        updateValue(move_start_value + move);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);

    onCleanup(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
    });
  });

  return (
    <div
      ref={ref => el = ref}
      class={styles.Parameter}
      style={{ "--progress": progress() }}
    >
      <span class={styles.parameterName} >{name}</span>
      <span class={styles.parameterSeparator}>:</span>
      <input type="number"
        ref={ref => input_el = ref}
        class={styles.parameterInput}
        value={value()}
        onchange={evt => set_value(+evt.target.value)}
        step={step}
        min={min}
        max={max}
        readonly={readonly()}
      />
    </div>
  )
}

function isMobile() {
  const calculateIsMobile = () => window.innerWidth < window.innerHeight;
  const [is_mobile, set_is_mobile] = createSignal(calculateIsMobile());
  createEffect(() => {
    const onResize = () => set_is_mobile(calculateIsMobile());
    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
  });
  return is_mobile();
}

function createRendrParameterSignal<T>(parameter: Parameter<T>) {
  const _value = parameter.value;
  const [value, set_value] = createSignal<T>(_value);

  createEffect(() => {

    function onChange() {
      set_value(() => parameter.value);
    }

    parameter.onMutate({ key: "value" }, onChange);

    onCleanup(() => parameter.unsubscribe(onChange));
  });

  function setValue(new_value: any) {
    parameter.set(new_value);
  }

  return [value, setValue] as [typeof value, typeof setValue];
}

function createRendrCacheSignal<T>(cache: Cache<T>) {
  const _value = cache.value;
  const [value, set_value] = createSignal<Cache<T>["value"]>(_value);

  createEffect(() => {

    function onChange(dependency: Dependency, action: Action) {
      const { key, index, value } = action;
      if (index === undefined) {
        set_value([...cache.value]);
      } else {
        set_value((cache) => {
          cache = [...cache]
          cache[index] = { ...cache[index], [key]: value };
          return cache;
        });
      }
    }

    cache.onMutate((action) => ["value", "valid"].includes(action.key), onChange);

    onCleanup(() => {
      cache.unsubscribe(onChange)
    });
  });

  function setValue(new_value: any) {
    cache.mutate({ key: "value", value: new_value });
  }

  return [value, setValue] as [typeof value, typeof setValue];
}

function createRendrCacheStore<T>(cache: Cache<T>) {

  const [store, set_store] = createStore<Cache<T>["value"]>([...cache.value]);

  function onChange(dependency: Dependency, action: Action) {
    const { key, index, value } = action;
    if (index === undefined) {
      set_store([...cache.value]);
    } else {
      if (store[index] === undefined)
        set_store(index, { ...cache.value[index] })
      else // @ts-ignore
        set_store(index, key, value);
    }
  }

  cache.onMutate({ key: "value" }, onChange);
  cache.onMutate({ key: "valid" }, onChange);

  onCleanup(() => {
    cache.unsubscribe(onChange)
  });


  function setStore(new_value: any) {
    cache.mutate({ key: "value", value: new_value });
  }


  return [store, setStore] as [typeof store, typeof setStore];
}

function createAnimationLoop(callback: () => void, running = true) {
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
