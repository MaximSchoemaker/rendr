import { type Component, For, JSX } from 'solid-js';
import { Cache, Parameter, Engine } from '../rendr/rendr';
import "../libs/video-builder";

import { Canvas } from './Canvas';
import { CanvasAnimation } from './CanvasAnimation';
import { Video } from './Video';
import { Status } from './Status';
import { NumberInput, NumberInputSettings } from './NumberInput';

export type UI = {
   createContainer: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createRow: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createColumn: (create: (ui: UI) => void, style?: JSX.CSSProperties) => void
   createGrid: (cols: number, rows: number, create: (ui: UI) => void, style?: JSX.CSSProperties) => void

   createStatus: (engine: Engine, max_tasks?: number, style?: JSX.CSSProperties) => void

   mountCanvas: (canvas: HTMLCanvasElement, style?: JSX.CSSProperties) => void
   mountCanvasAnimation: (canvas: Cache<HTMLCanvasElement>, tick_par: Parameter<number>, style?: JSX.CSSProperties) => void
   mountVideo: (video: HTMLVideoElement, style?: JSX.CSSProperties) => void

   createNumberInput: (initialValue: number, onChange: (value: number) => void, settings?: NumberInputSettings, style?: JSX.CSSProperties) => void
}

export function createUI(create: (ui: UI) => void) {
   let elements: JSX.Element[] = [];
   // onCleanup(() => elements = []);

   create({
      createContainer: (create, style) => elements.push(<Container create={create} style={style} />),
      createRow: (create, style) => elements.push(<Row create={create} style={style} />),
      createColumn: (create, style) => elements.push(<Column create={create} style={style} />),
      createGrid: (cols, rows, create, style) => elements.push(<Grid cols={cols} rows={rows} create={create} style={style} />),

      createStatus: (engine, max_tasks, style) => elements.push(<Status engine={engine} max_tasks={max_tasks} style={style} />),

      mountCanvas: (canvas, style) => elements.push(<Canvas canvas={canvas} style={style} />),
      mountCanvasAnimation: (cache, frame_par, style) => elements.push(<CanvasAnimation cache={cache} frame_par={frame_par} style={style} />),
      mountVideo: (video, style) => elements.push(<Video video={video} style={style} />),

      createNumberInput: (initialValue, onChange, settings, style) => elements.push(<NumberInput initialValue={initialValue} onChange={onChange} settings={settings} style={style} />),
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