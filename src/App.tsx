import { createEffect, onCleanup, createSignal, JSXElement, For, Index, Show, untrack, createResource, Suspense, ErrorBoundary } from 'solid-js';
import { createStore } from "solid-js/store";

import styles from './App.module.css';
import { mod, clamp, floorTo } from "../rendr/library/Utils";
import { Action, Cache, Dependency, Parameter, ParameterNumberOptions, SetupCallback } from '../rendr/rendr';

// @ts-ignore
// import setup from "../sketches/sketch";
// import setup from "../sketches/langton";
// import setup from "../sketches/boids";
import setup from "../sketches/sort";

type Component = (props?: any) => JSXElement

export class UI {
  AddComponent;
  constructor(AddComponent: (component: Component) => void) {
    this.AddComponent = AddComponent;
  }
  createContainer(callback: (ui: UI) => void) {
    this.AddComponent((props?: any) => <Container callback={callback} rest_props={props} />);
  }
  createViewContainer(callback: (ui: UI) => void) {
    this.AddComponent((props?: any) => <ViewContainer callback={callback} rest_props={props} />);
  }
  createWindow(callback: (ui: UI) => void) {
    this.AddComponent((props?: any) => <Window callback={callback} rest_props={props} />);
  }
  createTimeline(frames: number, tick_par: Parameter<number>, running_par: Parameter<boolean>, caches: Cache<any>[]) {
    this.AddComponent((props?: any) => <Timeline frames={frames} tick_par={tick_par} running_par={running_par} caches={caches} rest_props={props} />);
  }
  createView(frame_par: Parameter<OffscreenCanvas>) {
    this.AddComponent((props?: any) => <View frame_par={frame_par} rest_props={props} />);
  }
  createCacheView(tick_par: Parameter<number>, running_par: Parameter<boolean>, frame_cache: Cache<OffscreenCanvas>) {
    this.AddComponent((props?: any) => <CacheView tick_par={tick_par} running_par={running_par} frame_cache={frame_cache} rest_props={props} />);
  }
  createParameterNumber(name: string, parameter: Parameter<number>, options: ParameterNumberOptions) {
    this.AddComponent((props?: any) => <ParameterNumber name={name} parameter={parameter} options={options} rest_props={props} />);
  }
}

const App = () => {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  const sketch_name = params.get("sketch");

  const [setup] = createResource(sketch_name, (name) => import(`../sketches/${name}`));
  createEffect(() => {
    console.log(setup.error);
    console.log(setup());
  });

  return (
    <div class={styles.App}>
      <Show when={!setup.loading && setup() !== undefined}>
        <Sketch setup={setup()?.default} />
      </Show>
      <Show when={setup() === undefined}>
        <div class={styles.Links}>
          <a href="?sketch=sketch">sketch</a>
          <a href="?sketch=boids">boids</a>
          <a href="?sketch=langton">langton</a>
          <a href="?sketch=sort">sort</a>
        </div>
      </Show>
    </div>
  );
};

type SketchProps = {
  sketch_path?: string;
  setup?: SetupCallback
}

const Sketch = (props: SketchProps) => {

  const [components, set_components] = createSignal<Component[]>([]);

  function AddComponent(component: Component) {
    set_components(components => [...components, component]);
  }

  const createUI = (callback: (ui: UI) => void) => {
    const ui = new UI(AddComponent);
    callback(ui);
  }

  let cleanup: () => void;

  if (props.setup) cleanup = props.setup(createUI);

  if (props.sketch_path) {
    import(props.sketch_path /* @vite-ignore */
    ).then((SetupSketch) => {
      if (released) return
      const Setup = SetupSketch.default;
      cleanup = Setup(createUI);
    })
  }

  let released = false;
  onCleanup(() => {
    set_components([]);
    cleanup?.()
    released = true;
  });

  return (
    <div class={styles.Sketch}>
      <For each={components()}>{
        component => component()
      }</For>
    </div>
  );
}

type ContainerProps = {
  callback: (ui: UI) => void;
  rest_props: any;
}

const Container = ({ callback, rest_props }: ContainerProps) => {

  const [components, set_components] = createSignal<(Component)[]>([]);

  function AddComponent(component: Component) {
    set_components(components => [...components, component]);
  }

  const ui = new UI(AddComponent);
  callback(ui);

  return (
    <div  {...rest_props} class={styles.Container}>
      <For each={components()}>{component => component()}</For>
    </div>
  );
};


type ViewContainerProps = {
  callback: (ui: UI) => void;
  rest_props: any;
}

const ViewContainer = ({ callback, rest_props }: ViewContainerProps) => {

  const [components, set_components] = createSignal<(Component)[]>([]);

  function AddComponent(component: Component) {
    set_components(components => [...components, component]);
  }

  const ui = new UI(AddComponent);
  callback(ui);

  const stored_selected = JSON.parse(localStorage.getItem("selected") ?? "null");
  const [selected, set_selected] = createSignal<number | null>(Math.min(components().length - 1, stored_selected));
  createEffect(() => {
    localStorage.setItem("selected", JSON.stringify(selected()))
  });

  return (
    <div {...rest_props} class={styles.ViewContainer}>
      <For each={components()}>{(component, i) =>
        <Show when={selected() === null || selected() === i()} >
          {component({ onClick: () => set_selected(selected => selected === null ? i() : null) })}
        </Show>
      }</For>
    </div >
  );
};

type WindowProps = {
  callback: (ui: UI) => void;
  rest_props: any;
}

const Window = ({ callback, rest_props }: WindowProps) => {


  const [components, set_components] = createSignal<(Component)[]>([]);

  function AddComponent(component: Component) {
    set_components(components => [...components, component]);
  }

  const ui = new UI(AddComponent);
  callback(ui);

  return (
    <div {...rest_props} class={styles.Window}>
      <For each={components()}>{
        component => component()
      }</For>
    </div>
  );
};

type TimelineProps = {
  frames: number;
  tick_par: Parameter<number>;
  running_par: Parameter<boolean>;
  caches: Cache<any>[];
  rest_props: any;
}

function Timeline({ frames, tick_par, running_par, caches, rest_props }: TimelineProps) {
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

  const compressed = frames > 400;

  return (
    <div
      {...rest_props}
      ref={ref => el = ref}
      class={`${styles.Timeline} ${compressed ? styles.compressed : ''}`}
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
      {/* <div class={styles.frameTooltip}>{props.item?.value?.length}</div> */}
    </div>
  );
}

type ViewProps = {
  frame_par: Parameter<OffscreenCanvas>;
  rest_props: any;
}

function View({ frame_par, rest_props }: ViewProps) {
  const [frame] = createRendrParameterSignal<OffscreenCanvas>(frame_par);

  let el: HTMLCanvasElement;
  createEffect(() => {
    const ctx = el.getContext('2d');
    const canvas = frame();

    if (!canvas) {
      ctx?.clearRect(0, 0, el.width, el.height);
      return;
    }

    el.width = canvas.width;
    el.height = canvas.height;

    if (!ctx) return;

    console.log("draw View");
    ctx.drawImage(canvas, 0, 0);
  });

  return (
    <canvas
      {...rest_props}
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
  frame_cache: Cache<OffscreenCanvas>;
  rest_props: any;
}

function CacheView({ tick_par, running_par, frame_cache, rest_props }: CacheViewProps) {
  const [tick] = createRendrParameterSignal<number>(tick_par);
  const [running] = createRendrParameterSignal<boolean>(running_par);
  // const [cache] = createRendrCacheSignal<OffscreenCanvas>(frame_cache);

  let el: HTMLCanvasElement;
  let prev_frame: OffscreenCanvas | undefined;
  const loop = createAnimationLoop(() => {
    const request_index = 0; //running() ? 0 : tick();
    frame_cache.request(request_index);

    // let frame = !frame_cache.get(tick())
    //   ? frame_cache.getLatest(tick())
    //   : frame_cache.getLatestValid(tick());
    let frame = frame_cache.getLatestValid(tick());
    frame ??= frame_cache.get(request_index);

    if (!el
      || !frame
      // || frame === prev_frame
    ) return;

    el.width = frame.width;
    el.height = frame.height;

    const ctx = el.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(frame, 0, 0);
    prev_frame = frame;
  });
  onCleanup(loop.stop);

  function onForce(dependency: Dependency, action: Action) {
    if (action.index === tick()) prev_frame = undefined
  }
  frame_cache.onMutate({ force: true }, onForce);
  onCleanup(() => frame_cache.unsubscribe(onForce));



  return (
    <canvas
      {...rest_props}
      class={styles.View}
      ref={(ref) => el = ref}
      width={1080}
      height={1080}
    />
  );
}

type ParameterNumberProps = {
  name: string;
  parameter: Parameter<number>;
  options: ParameterNumberOptions;
  rest_props: any;
}

function ParameterNumber({ name, parameter, options = {}, rest_props }: ParameterNumberProps) {
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
      {...rest_props}
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
  const value = parameter.value;
  const [value_obj, set_value_obj] = createSignal<{ value: T }>({ value });

  createEffect(() => {

    function onChange() {
      set_value_obj(() => ({ value: parameter.value }));
    }

    parameter.onMutate({ key: "value" }, onChange);

    onCleanup(() => parameter.unsubscribe(onChange));
  });

  function setValue(new_value: any) {
    parameter.set(new_value);
  }

  return [() => value_obj().value, setValue] as [() => typeof value, typeof setValue];
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
