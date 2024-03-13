import { type Component, For, JSX, onMount, onCleanup, createMemo, createSignal } from 'solid-js';
import { Cache, Parameter, Render, Task, createAnimationLoop } from './rendr/rendr';
import { floorTo } from './rendr/utils';

export type UI = {
   createContainer: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createRow: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createColumn: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createView: (canvas: ViewProps["canvas"]) => void
   createCacheView: (canvas: CacheViewProps["cache"], tick_par: CacheViewProps["frame_par"]) => void
   createStatus: (render: Render) => void
}

export function createUI(create: (ui: UI) => void) {
   let elements: JSX.Element[] = [];
   // onCleanup(() => elements = []);

   create({
      createContainer: (create, style) => elements.push(<Container create={create} style={style} />),
      createRow: (create, style) => elements.push(<Row create={create} style={style} />),
      createColumn: (create, style) => elements.push(<Column create={create} style={style} />),

      createView: (canvas) => elements.push(<View canvas={canvas} />),
      createCacheView: (cache, frame_par) => elements.push(<CacheView cache={cache} frame_par={frame_par} />),

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
}

export const View: Component<ViewProps> = (props) => {

   props.canvas.style = `
      display: block;
      background-color: black;
      width: max-content;
      height: max-content;
      max-width: 100%;
      max-height: 100%;
      min-width: 0;
      min-height: 0;
      flex: 0 1 auto;
      // aspect-ratio: 1 / 1;
      // object-fit: contain; 
   `;

   return props.canvas;
}

type CacheViewProps = {
   cache: Cache<HTMLCanvasElement>
   frame_par: Parameter<number>
}

export const CacheView: Component<CacheViewProps> = (props) => {

   const canvas = createMemo(() => {
      const canvas = props.cache.getLatest(props.frame_par.get())
      if (canvas)
         canvas.style = `
      display: block;
      background-color: black;
      width: max-content;
      height: max-content;
      max-width: 100%;
      max-height: 100%;
      min-width: 0;
      min-height: 0;
      flex: 0 1 auto;
      // aspect-ratio: 1 / 1;
      // object-fit: contain; 
   `;
      return canvas;
   });

   return <>
      {canvas()}
   </>;
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
   const height = 12;
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
         ctx.rect(i, height, 1, -Math.ceil(value * (height - 1)));
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
      // "background-color": "white",
      "outline": "1px solid black",
      "outline-offset": "-1px",
   }} />
}
