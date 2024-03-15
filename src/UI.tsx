import { type Component, For, JSX, onMount, onCleanup, createMemo, createSignal, Show, createEffect } from 'solid-js';
import { Cache, Parameter, Render, Task, createAnimationLoop } from './rendr/rendr';
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
   createView: (canvas: ViewProps["canvas"], style?: JSX.CSSProperties) => void
   createCacheView: (canvas: CacheViewProps["cache"], tick_par: CacheViewProps["frame_par"], style?: JSX.CSSProperties) => void
   createStatus: (render: Render) => void
}

export function createUI(create: (ui: UI) => void) {
   let elements: JSX.Element[] = [];
   // onCleanup(() => elements = []);

   create({
      createContainer: (create, style) => elements.push(<Container create={create} style={style} />),
      createRow: (create, style) => elements.push(<Row create={create} style={style} />),
      createColumn: (create, style) => elements.push(<Column create={create} style={style} />),

      createView: (canvas, style) => elements.push(<View canvas={canvas} style={style} />),
      createCacheView: (cache, frame_par, style) => elements.push(<CacheView cache={cache} frame_par={frame_par} style={style} />),

      createStatus: (render) => elements.push(<Status render={render} />),
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
         "width": "100%",
         "height": "100%",
         "max-width": "100%",
         "max-height": "100%",
         "min-width": "0",
         "min-height": "0",
         "flex": "0 1 100%",
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
   "gap": "5px",
   ...props.style,
}} />

export const Column: Component<ContainerProps> = (props) => <Row {...props} style={{
   "flex-direction": "column",
   ...props.style,
}} />

type ViewProps = {
   canvas: HTMLCanvasElement
   style?: JSX.CSSProperties
}

export const View: Component<ViewProps> = (props) => {

   const [recording, set_recording] = createSignal(false);

   const { canvas } = props;
   canvas.className = styles.ViewCanvas;
   const aspect_ratio = canvas.width / canvas.height;

   function onKeyDown(evt: KeyboardEvent) {
      if (evt.key === "Enter") {
         set_recording(true);
         setTimeout(() => {
            screenshot();
            set_recording(false);
         });
      }
   }

   function screenshot(name = "screenshot") {
      const image_blob_url = canvas.toDataURL("image/png", 1);

      const { width, height } = canvas;
      const date = new Date().toLocaleString();
      const file_name = `${name} - ${date} - ${width}x${height}.png`;

      download_url(image_blob_url, file_name);
   }

   return <div class={styles.ViewContainer} tabIndex={0} onKeyDown={onKeyDown} style={{
      "aspect-ratio": aspect_ratio,
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

   const canvas = createMemo(() => {
      const canvas = props.cache.getLatest(props.frame_par.get())
      if (!canvas) return null;

      canvas.className = styles.ViewCanvas;
      set_aspect_ratio(canvas.width / canvas.height);

      return canvas;
   });

   function onKeyDown(evt: KeyboardEvent) {
      if (evt.key === "Enter") {
         set_recording(true);
         setTimeout(() => {
            record();
            set_recording(false);
         });
      }
   }

   function record(name = "recording", quality = 1, fps = 60) {
      const { cache } = props;

      const first_frame = cache.get(0);
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
         const frame = cache.get(i);
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

   return <div class={styles.ViewContainer} tabIndex={0} onKeyDown={onKeyDown} style={{
      "aspect-ratio": aspect_ratio(),
      ...props.style,
   }}>
      <div class={styles.recordIcon} hidden={!recording()}>🔴</div>
      {canvas()}
   </div>;
}

type StatusProps = {
   render: Render
}

export const Status: Component<StatusProps> = (props) => {

   const tasks = props.render.scheduler.tasks;

   return (
      <>
         <div style={{
            // "flex": "1",
            "display": "flex",
            "flex-direction": "column",
            "gap": tasks.length < 20 ? "2px" : "0px",
            // "height": "0",
            "width": "100%",
            // "outline": "1px solid orange",
            // "outline-offset": "-1px",
            "align-self": "flex-start",
         }}>
            <For each={tasks}>{task =>
               <div style={{
                  "display": "flex",
                  "width": "100%",
                  "height": "20px",
                  "gap": "2px",
               }}>
                  <TaskProgress task={task} />
                  <TaskPerformance task={task} />
               </div>
            }</For>
         </div>
         {/* <div style={{
            "flex": "0 1 0",
            "display": "flex",
            "gap": "5px",
            "max-width": "100%",
         }}>
            <TaskProgress task={props.render.scheduler} />
         </div> */}
      </>
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
      "background-color": "black",
      // "outline": "1px solid black",
      // "outline-offset": "-1px",
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
      // "height": "100%",
      // "max-width": "100%",
      // "height": height + "px",
      "min-width": "0",
      "min-height": "0",
      "image-rendering": "pixelated",
      // "background-color": "black",
      "outline": "1px solid black",
      "outline-offset": "-1px",
   }} />
}
