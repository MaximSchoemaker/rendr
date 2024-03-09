import { type Component, For, JSX, onMount } from 'solid-js';
import { createAnimationLoop } from './rendr/rendr';

export type UI = {
   createContainer: (create: (ui: UI) => void) => void
   createRow: (create: (ui: UI) => void) => void
   createColumn: (create: (ui: UI) => void) => void
   createView: (canvas: ViewProps["canvas"]) => void
}

export function createUI(create: (ui: UI) => void) {
   const elements: JSX.Element[] = [];

   create({
      createContainer: (create) => elements.push(<Container create={create} />),
      createRow: (create) => elements.push(<Row create={create} />),
      createColumn: (create) => elements.push(<Column create={create} />),
      createView: (canvas) => elements.push(<View canvas={canvas} />)
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
         "width": "fit-content",
         "height": "fit-content",
         "max-width": "100%",
         "max-height": "100%",
         "min-width": "0",
         "min-height": "0",
         "flex": "0 1 auto",
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
      width: min-content;
      height: min-content;
      max-width: 100%;
      max-height: 100%;
      min-width: 0;
      min-height: 0;
      // flex: 1 1 auto;
      // aspect-ratio: 1 / 1;
      // object-fit: contain; 
   `;

   return props.canvas;

   return (
      <div style={{
         // "display": "flex",
         "flex": "0 1 100%",
         // width: "1px",
         // height: "1px",
         "max-width": "100%",
         "max-height": "100%",
         "min-width": "0",
         "min-height": "0",
         "aspect-ratio": "1 / 1",
         "background-color": "black",
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
