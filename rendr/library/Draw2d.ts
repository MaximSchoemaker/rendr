type Vector2T = {
   x: number,
   y: number,
}

type Draw2dActionsT = {
   beginPath?: boolean;
   closePath?: boolean;
   fill?: boolean;
   stroke?: boolean;
}

type CanvasStyle = { fillStyle?: CanvasFillStrokeStyles["fillStyle"], strokeStyle?: CanvasFillStrokeStyles["strokeStyle"] }
type CanvasRenderingContextProperties = CanvasStyle & CanvasCompositing & CanvasFilters & CanvasImageSmoothing & CanvasShadowStyles & CanvasTextDrawingStyles
type Draw2dActionsAndSettingsT = Draw2dActionsT & CanvasRenderingContextProperties;
export type Draw2dConfigT = Draw2dActionsAndSettingsT | Draw2dActionsAndSettingsT[];

export function mergeConfigs(config1: Draw2dConfigT | undefined, config2: Draw2dConfigT | undefined) {
   if (config1 === undefined)
      return config2 ?? {} as Draw2dConfigT;

   return Array.isArray(config2)
      ? Array.isArray(config1)
         ? config2
         : config2.map(c => ({ ...config1, ...c }))
      : Array.isArray(config1)
         ? config1.map(c => ({ ...c, ...config2 }))
         : { ...config1, ...config2 };
}

class Draw2dContextBase {
   canvas: HTMLCanvasElement & OffscreenCanvas;
   _config?: Draw2dConfigT;

   constructor(canvas: HTMLCanvasElement & OffscreenCanvas) {
      this.canvas = canvas;
   }

   clear(color: string) {
      Draw2d.clear(this.canvas, color);
   }

   config(config: Draw2dConfigT) {
      this._config = config;
   }
   beginPath() {
      Draw2d.beginPath(this.canvas);
   }
   closePath() {
      Draw2d.closePath(this.canvas);
   }
   stroke() {
      Draw2d.stroke(this.canvas);
   }
   fill() {
      Draw2d.fill(this.canvas);
   }
   beginDraw(config: Draw2dConfigT) {
      const merged_config = mergeConfigs(this._config, config);
      Draw2d.beginDraw(this.canvas, merged_config);
   }
   endDraw(config: Draw2dConfigT) {
      const merged_config = mergeConfigs(this._config, config);
      Draw2d.endDraw(this.canvas, merged_config);
   }
}

export class Draw2dContext extends Draw2dContextBase {
   moveTo(x1: number, y1: number, config?: Draw2dConfigT) {
      const merged_config = mergeConfigs(this._config, config);
      Draw2d.moveTo(this.canvas, x1, y1, merged_config);
   }
   lineTo(x1: number, y1: number, config?: Draw2dConfigT) {
      const merged_config = mergeConfigs(this._config, config);
      Draw2d.lineTo(this.canvas, x1, y1, merged_config);
   }
   line(x1: number, y1: number, x2: number, y2: number, config?: Draw2dConfigT) {
      const merged_config = mergeConfigs(this._config, config);
      Draw2d.line(this.canvas, x1, y1, x2, y2, merged_config);
   }
   circle(x: number, y: number, r: number, config?: Draw2dConfigT) {
      const merged_config = mergeConfigs(this._config, config);
      Draw2d.arc(this.canvas, x, y, r, 0, Math.PI * 2, false, merged_config);
   }
}

export class Draw2dVectorContext extends Draw2dContextBase {
   moveTo(p: Vector2T, config?: Draw2dConfigT) {
      Draw2d.moveTo(this.canvas, p.x, p.y, config);
   }
   lineTo(p: Vector2T, config?: Draw2dConfigT) {
      Draw2d.lineTo(this.canvas, p.x, p.y, config);
   }
   line(p1: Vector2T, p2: Vector2T, config?: Draw2dConfigT) {
      Draw2d.line(this.canvas, p1.x, p1.y, p2.x, p2.y, config);
   }
}

export default class Draw2d {
   static beginDraw(canvas: HTMLCanvasElement & OffscreenCanvas, config?: Draw2dConfigT) {
      const ctx = canvas.getContext("2d");
      if (ctx === null || config === undefined) return;

      const beginDraw_config = (Array.isArray(config) ? config[0] : config);
      if (beginDraw_config.beginPath)
         ctx.beginPath();
   }

   static endDraw(canvas: HTMLCanvasElement & OffscreenCanvas, config?: Draw2dConfigT) {
      const ctx = canvas.getContext("2d");
      if (ctx === null || config === undefined) return;

      ctx.save();

      const endDraw_config = Array.isArray(config) ? config : [config];
      endDraw_config.forEach(config => {
         Object.entries(config)
            .forEach(([key, val]) => {
               if (ctx[key] != undefined && typeof ctx[key] !== 'function')
                  ctx[key] = val;
            });

         if (config.closePath)
            ctx.closePath();
         if (config.fill)
            ctx.fill();
         if (config.stroke)
            ctx.stroke();
      });

      ctx.restore();
   }

   static beginPath(canvas: HTMLCanvasElement & OffscreenCanvas) {
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;
      ctx.beginPath();
   }

   static closePath(canvas: HTMLCanvasElement & OffscreenCanvas) {
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;
      ctx.closePath();
   }

   static stroke(canvas: HTMLCanvasElement & OffscreenCanvas) {
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;
      ctx.stroke();
   }

   static fill(canvas: HTMLCanvasElement & OffscreenCanvas) {
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;
      ctx.fill();
   }

   static clear(canvas: HTMLCanvasElement & OffscreenCanvas, color: string) {
      const { width, height } = canvas;

      const ctx = canvas.getContext("2d");
      if (ctx === null) return;

      ctx.save();
      ctx.resetTransform();
      ctx.globalCompositeOperation = "copy";
      ctx.fillStyle = color ?? "transparent";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
   }

   static moveTo(canvas: HTMLCanvasElement & OffscreenCanvas, x: number, y: number, config?: Draw2dConfigT) {
      config && this.beginDraw(canvas, config);
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;

      ctx.moveTo(x, y);
      config && this.endDraw(canvas, config);
   }

   static lineTo(canvas: HTMLCanvasElement & OffscreenCanvas, x: number, y: number, config?: Draw2dConfigT) {
      config && this.beginDraw(canvas, config);
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;

      ctx.lineTo(x, y);
      config && this.endDraw(canvas, config);
   }

   static line(canvas: HTMLCanvasElement & OffscreenCanvas, x1: number, y1: number, x2: number, y2: number, config?: Draw2dConfigT) {
      config && this.beginDraw(canvas, config);
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      config && this.endDraw(canvas, config);
   }

   static arc(canvas: HTMLCanvasElement & OffscreenCanvas, x: number, y: number, r: number, a1: number, a2: number, flipped: boolean, config?: Draw2dConfigT) {
      config && this.beginDraw(canvas, config);
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;

      ctx.arc(x, y, r, a1, a2, flipped);
      config && this.endDraw(canvas, config);
   }
}