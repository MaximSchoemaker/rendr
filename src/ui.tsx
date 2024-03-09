import { type Component, For, JSX, onMount, onCleanup } from 'solid-js';
import { Render, Task, createAnimationLoop } from './rendr/rendr';
import { floorTo } from './rendr/utils';

export type UI = {
   createContainer: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createRow: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createColumn: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createView: (canvas: ViewProps["canvas"]) => void
   createPerformance: (render: Render) => void
}

export function createUI(create: (ui: UI) => void) {
   let elements: JSX.Element[] = [];
   // onCleanup(() => elements = []);

   create({
      createContainer: (create, style) => elements.push(<Container create={create} style={style} />),
      createRow: (create, style) => elements.push(<Row create={create} style={style} />),
      createColumn: (create, style) => elements.push(<Column create={create} style={style} />),
      createView: (canvas) => elements.push(<View canvas={canvas} />),
      createPerformance: (render) => elements.push(<Performance render={render} />),
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

   // let view: HTMLCanvasElement;

   // onMount(() => {
   //    createAnimationLoop(() => {
   //       const ctx = view.getContext("2d");
   //       if (!ctx) return;

   //       ctx.clearRect(0, 0, props.canvas.width, props.canvas.height);
   //       ctx.drawImage(props.canvas, 0, 0);
   //    });
   // });

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

   return (
      <div style={{
         "display": "flex",
         "align-items": "center",
         "justify-content": "center",
         "width": "100%",
         "height": "100%",
         "max-width": "100%",
         "max-height": "100%",
         "min-width": "0",
         "min-height": "0",
         "flex": "1 1 0",
      }}>
         {props.canvas}
      </div>
   );

   // return <canvas {...props.canvas}
   //    // ref={view!}
   //    width={props.canvas.width}
   //    height={props.canvas.height}
   //    style={{
   //       "background-color": "black",
   //       "max-width": "100%",
   //       "max-height": "100%",
   //       "min-width": 0,
   //       "min-height": 0,
   //       "display": "block",
   //       // "flex": "0 1 1",
   //    }}
   // />
}

type PerformanceProps = {
   render: Render
}

export const Performance: Component<PerformanceProps> = (props) => {

   const tasks = props.render.scheduler.tasks;

   return (
      <>
         <div style={{
            "flex": "1",
            "display": "flex",
            "gap": tasks.length < 20 ? "5px" : "0px",
            "width": "100%",
            "min-height": "15px",
            "max-height": "15px",
         }}>
            <For each={tasks}>{task =>
               <TaskPerformance task={task} />
            }</For>
         </div>
         {/* <div style={{
            "flex": "0 1 0",
            "display": "flex",
            "gap": "5px",
            "max-width": "100%",
         }}>
            <TaskPerformance task={props.render.scheduler} />
         </div> */}
      </>
   );
}

type TaskPerformanceProps = {
   task: Task
}

export const TaskPerformance: Component<TaskPerformanceProps> = (props) => {

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
      "image-rendering": "pixelated",
      "background-color": "black",
   }} />
}