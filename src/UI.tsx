import { type Component, For, JSX, onMount, onCleanup, createMemo, createSignal, Show, createEffect } from 'solid-js';
import { Cache, Parameter, Engine, Task, createAnimationLoop } from './rendr/rendr';
import { download_url, floorTo } from './rendr/utils';
import styles from './UI.module.css';
import "./libs/video-builder";

declare class VideoBuilder {
   constructor(config: { w: number, h: number, fps: number, quality: number })
   addCanvasFrame(canvas: HTMLCanvasElement | OffscreenCanvas): void
   finish(onFinish: (video_blob_url: string) => void): void
   frameList: Blob[]
}

export type UI = {
   createContainer: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createRow: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createColumn: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createGrid: (cols: number, rows: number, create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createView: (canvas: ViewProps["canvas"], style?: JSX.CSSProperties) => void
   createCacheView: (canvas: CacheViewProps["cache"], tick_par: CacheViewProps["frame_par"], style?: JSX.CSSProperties) => void
   createVideo: (video: HTMLVideoElement, style?: JSX.CSSProperties) => void
   createStatus: (engine: Engine, max_tasks?: number, style?: JSX.CSSProperties) => void
}

export function createUI(create: (ui: UI) => void) {
   let elements: JSX.Element[] = [];
   // onCleanup(() => elements = []);

   create({
      createContainer: (create, style) => elements.push(<Container create={create} style={style} />),
      createRow: (create, style) => elements.push(<Row create={create} style={style} />),
      createColumn: (create, style) => elements.push(<Column create={create} style={style} />),
      createGrid: (cols, rows, create, style) => elements.push(<Grid cols={cols} rows={rows} create={create} style={style} />),

      createView: (canvas, style) => elements.push(<View canvas={canvas} style={style} />),
      createCacheView: (cache, frame_par, style) => elements.push(<CacheView cache={cache} frame_par={frame_par} style={style} />),
      createVideo: (video, style) => elements.push(<VideoView video={video} style={style} />),

      createStatus: (engine, max_tasks, style) => elements.push(<Status engine={engine} max_tasks={max_tasks} style={style} />),
   });

   return elements;
}


type ContainerProps = {
   create: (ui: UI) => void
   style?: JSX.CSSProperties
}

export const Container: Component<ContainerProps> = (props) => {

   const elements = createUI(props.create);

   return (
      <div style={{
         "max-width": "100%",
         "max-height": "100%",
         "min-width": "0",
         "min-height": "0",
         "flex": "1",
         ...props.style
      }}>
         <For each={elements}>
            {element => element}
         </For>
      </div>
   );
}

export const Row: Component<ContainerProps> = (props) => <Container {...props} style={{
   "display": "flex",
   "align-items": "center",
   "justify-content": "center",
   "gap": "4px",
   ...props.style,
}} />

export const Column: Component<ContainerProps> = (props) => <Row {...props} style={{
   "flex-direction": "column",
   ...props.style,
}} />

type GridProps = ContainerProps & {
   cols: number
   rows: number
}

export const Grid: Component<GridProps> = (props) => <Container {...props} style={{
   "display": "grid",
   "gap": "4px",
   "grid-template-columns": `repeat(${props.cols}, 1fr)`,
   "grid-template-rows": `repeat(${props.rows}, 1fr)`,
   ...props.style,
}} />

type ViewProps = {
   canvas: HTMLCanvasElement
   style?: JSX.CSSProperties
}

export const View: Component<ViewProps> = (props) => {

   const [recording, set_recording] = createSignal(false);
   const [fullscreen, setFullscreen] = createSignal(false);

   props.canvas.className = styles.ViewCanvas;
   const aspect_ratio = props.canvas.width / props.canvas.height;

   function onKeyDown(evt: KeyboardEvent) {
      switch (evt.key) {
         case "Enter":
            onScreenshot();
            break;
         case "f":
            onFullscreen();
            break;
      }
   }

   function onDoubleClick(evt: MouseEvent) {
      onFullscreen();
   }


   function onScreenshot() {
      set_recording(true);
      setTimeout(() => {
         screenshot();
         set_recording(false);
      }, 5);
   }

   function onFullscreen(value?: boolean) {
      if (value === undefined) {
         setFullscreen(fs => !fs);
      } else {
         setFullscreen(value);
      }
      if (fullscreen()) window.document.body.requestFullscreen();
      else document.exitFullscreen();
   }

   function screenshot(name = "screenshot") {
      const image_blob_url = props.canvas.toDataURL("image/png", 1);

      const { width, height } = props.canvas;
      const date = new Date().toLocaleString();
      const file_name = `${name} - ${date} - ${width}x${height}.png`;

      download_url(image_blob_url, file_name);
   }

   const className = () => `${styles.ViewContainer} ${fullscreen() ? styles.fullscreen : ''}`;

   return <div class={className()} tabIndex={0} onKeyDown={onKeyDown} onDblClick={onDoubleClick} style={{
      "aspect-ratio": fullscreen() ? undefined : aspect_ratio,
      ...props.style,
   }}>
      <div class={styles.recordIcon} hidden={!recording()}>🔴</div>
      {props.canvas}
   </div>;
}

type CacheViewProps = {
   cache: Cache<HTMLCanvasElement>
   frame_par: Parameter<number>
   style?: JSX.CSSProperties
}

export const CacheView: Component<CacheViewProps> = (props) => {

   const [aspect_ratio, set_aspect_ratio] = createSignal(1);
   const [recording, set_recording] = createSignal(false);
   const [fullscreen, setFullscreen] = createSignal(false);

   const canvas = createMemo(() => {
      const canvas = props.cache.getLatestSafe(Math.floor(props.frame_par.getSafe() ?? 0))
      // const canvas = props.cache.getLatestSafe(props.cache.count)
      if (!canvas) return null;

      canvas.className = styles.ViewCanvas;
      set_aspect_ratio(canvas.width / canvas.height);

      return canvas;
   });

   function onKeyDown(evt: KeyboardEvent) {
      switch (evt.key) {
         case "Enter":
            onRecord();
            break;
         case "f":
            onFullscreen();
            break;
      }
   }

   function onDoubleClick(evt: MouseEvent) {
      onFullscreen();
   }

   function onRecord() {
      set_recording(true);
      setTimeout(() => {
         record();
         set_recording(false);
      }, 5);
   }

   function onFullscreen(value?: boolean) {
      if (value === undefined) {
         setFullscreen(fs => !fs);
      } else {
         setFullscreen(value);
      }
      if (fullscreen()) window.document.body.requestFullscreen();
      else document.exitFullscreen();
   }

   function record(name = "recording", quality = 1, fps = 60) {
      const { cache } = props;

      const first_frame = cache.getSafe(0);
      if (!first_frame) { console.warn("cache does not have a frame at index 0", cache); return; }

      const { width, height } = first_frame;
      const date = new Date().toLocaleString();
      const file_name = `${name} - ${date} - Q${quality} - FPS_${fps} - ${width}x${height}.avi`;

      console.log(
         "🔴 %crecording...", "color: #00FF88", "\n",
         "name:", name, "\n",
         "quality:", quality, "\n",
         "fps:", fps, "\n",
         "file_name:", file_name,
      );

      const video_builder = new VideoBuilder({ w: width, h: height, fps, quality });

      for (let i = 0; i < cache.count; i++) {
         const frame = cache.getSafe(i);
         if (!frame) continue;
         video_builder.addCanvasFrame(frame);
      }

      console.log(
         "🔨 %cbuilding...", "color: #00FF88", "\n",
         "frames:", video_builder.frameList.length
      );

      video_builder.finish((video_blob_url: string) => {
         console.log(
            "🎉 %cdone!", "color: #00FF88", "\n",
            file_name, "\n",
            video_blob_url
         );
         download_url(video_blob_url, file_name)
      });
   }


   const className = () => `${styles.ViewContainer} ${fullscreen() ? styles.fullscreen : ''}`;

   return <div class={className()} tabIndex={0} onKeyDown={onKeyDown} onDblClick={onDoubleClick} style={{
      "aspect-ratio": fullscreen() ? undefined : aspect_ratio(),
      "position": fullscreen() ? undefined : "relative",
      ...props.style,
   }}>
      <div class={styles.recordIcon} hidden={!recording()}>🔴</div>
      <div style={{ inset: "0", "position": "absolute" }} ></div>
      {canvas()}
   </div>;
}

type VideoViewProps = {
   video: HTMLVideoElement
   style?: JSX.CSSProperties
}

export const VideoView: Component<VideoViewProps> = (props) => {

   props.video.className = styles.ViewCanvas;
   props.video.style.width = props.video.width + 'px';
   props.video.style.height = props.video.height + 'px';

   const aspect_ratio = props.video.width / props.video.height;

   return <div class={styles.ViewContainer} tabIndex={0} style={{
      "aspect-ratio": aspect_ratio,
      ...props.style,
   }}>
      {props.video}
   </div>;
}

type StatusProps = {
   engine: Engine
   max_tasks?: number
   style?: JSX.CSSProperties
}

export const Status: Component<StatusProps> = (props) => {

   const tasks = props.engine.scheduler.tasks;

   const [hidden, setHidden] = createSignal(false);

   function onKeyDown(evt: KeyboardEvent) {
      switch (evt.key) {
         case "h":
            setHidden(h => !h);
      }
   }

   window.addEventListener("keydown", onKeyDown);
   onCleanup(() => window.removeEventListener("keydown", onKeyDown));

   const show_task = () => tasks.slice(0, props.max_tasks)

   return (
      <Show when={!hidden()}>
         <div style={{
            // "flex": "1",
            "display": "flex",
            "flex-direction": "column",
            "justify-content": "flex-end",
            "gap": "2px",
            // "height": "0",
            "width": "100%",
            // "outline": "1px solid orange",
            // "outline-offset": "-1px",
            "align-self": "flex-start",
            // "height": "32px",
            // "overflow-y": "auto",
            ...props.style,
         }}>
            <For each={show_task()}>{task =>
               <div style={{
                  "display": "flex",
                  "width": "100%",
                  "height": "15px",
                  "min-height": "0px",
                  "min-width": "0px",
                  "flex": "0 1 auto",
                  "gap": "2px",
               }}>
                  <TaskProgress task={task} />
                  <TaskPerformance task={task} />
               </div>
            }</For>
         </div>
      </Show>
   );
}

type TaskProgressProps = {
   task: Task
}

export const TaskProgress: Component<TaskProgressProps> = (props) => {

   const width = 100;
   const height = 1;
   let el: HTMLCanvasElement;

   let prev_progress = -1;
   createAnimationLoop(() => {
      const ctx = el.getContext("2d");
      if (!ctx) return;

      const progress = floorTo(props.task.progress(), width);
      if (progress === prev_progress) return;
      prev_progress = progress;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgb(0, 255, 128)";
      ctx.beginPath();
      ctx.rect(0, 0, progress * width, height);
      ctx.fill();
   });

   return <canvas ref={ref => el = ref} width={width} height={height} style={{
      "flex": "1",
      "width": "100%",
      "height": "100%",
      "min-width": "0",
      "min-height": "0",
      // "max-height": "15px",
      "image-rendering": "pixelated",
      // "background-color": "var(--background-color)",
      "outline": "1px solid var(--foreground-color)",
      "outline-offset": "-1px",
   }} />
}


type TaskPerformanceProps = {
   task: Task
}

export const TaskPerformance: Component<TaskPerformanceProps> = (props) => {

   const size = 100;
   const height = 10;
   let el: HTMLCanvasElement;

   let buffer = new Array(size).fill(0);
   let head = 0;
   let last_run_time = 0;
   createAnimationLoop((delta) => {
      const ctx = el.getContext("2d");
      if (!ctx) return;

      const { run_time } = props.task;
      buffer[head] = (run_time - last_run_time) / delta;
      last_run_time = run_time;
      head = (head + 1) % size;

      ctx.clearRect(0, 0, size, height);
      ctx.fillStyle = "rgb(255, 0, 128)";

      for (let i = 0; i < size; i++) {
         const index = (i + head) % size;
         const value = buffer[index];
         if (value === 0) continue;

         ctx.beginPath();
         ctx.rect(i, height, 1, -Math.ceil(value * height));
         ctx.fill();
      }
   });

   return <canvas ref={ref => el = ref} width={size} height={height} style={{
      "flex": "1",
      "width": "100%",
      "height": "100%",
      // "max-width": "100%",
      // "height": height + "px",
      "min-width": "0",
      "min-height": "0",
      "image-rendering": "pixelated",
      // "background-color": "var(--background-color)",
      "outline": "1px solid var(--foreground-color)",
      "outline-offset": "-1px",
   }} />
}
