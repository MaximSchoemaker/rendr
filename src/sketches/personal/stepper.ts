import { createAnimationLoop, createParameter, createSketch } from "../../rendr/rendr";
import { Layout, cos, getColor, getLayout, inv_cosn, map, mod, sin, sinn, step, tri } from "../../rendr/utils";

const FPS = 60;
const FRAMES = 500 * FPS / 60;

const PAD = 0.15;

// ... portraid ...
// const WIDTH = 1080;
// const HEIGHT = 1920;
// const LAYOUT = getLayout('fill', WIDTH, HEIGHT, PAD);

// ... landscape  ...
const WIDTH = 1920;
const HEIGHT = 1080;
const LAYOUT = getLayout('fit', WIDTH, HEIGHT, PAD);

// ... video ...
const LOOPS = 2;

type Props = {
   REALTIME: boolean;
   ANIMATION: boolean;
   VIDEO: boolean;
}

function timeline<T>(t: number, ...fns: ((t: number) => T)[]) {
   const count = fns.length;
   const index = Math.floor(t * count);
   const fn_t = t * count - index;
   return fns[index](fn_t);
}

export default createSketch<Props>((engine, ui, props) => {

   const { REALTIME, ANIMATION, VIDEO } = props;

   function animation(ctx: CanvasRenderingContext2D, layout: Layout, t: number) {
      const { width, height, screenX, screenY } = layout;

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, getColor(1, 0.4, 0.0));
      gradient.addColorStop(1, getColor(1, 0.1, 0.4));

      // const gradient = ctx.createConicGradient(0.5 * Math.PI, screenX(0.5), screenY(0.5));
      // gradient.addColorStop(0, getColor(0.5, 0.0, 1.0));
      // gradient.addColorStop(0.5, getColor(1.0, 0.5, 0.0));
      // gradient.addColorStop(1, getColor(0.5, 0.0, 1.0));

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const min = -0.1
      const { arms, steps, angle_offset } = timeline(t,
         t => ({ steps: map(inv_cosn(t), min, 3), arms: 2, angle_offset: -3 / 24 }),
         t => ({ steps: map(inv_cosn(t), min, 5), arms: 3, angle_offset: -2 / 24 }),
         t => ({ steps: map(Math.pow(inv_cosn(t), 2), min, 50), arms: -5, angle_offset: 0 }),
      );

      const getP = (angle: number, offset_x: number, offset_y: number) => {
         const radius_sig = step((angle + angle_offset) * arms + t * Math.abs(arms), steps);

         const radius_min = 0.2 + (steps > 0 ? 0 : steps) * 0.25;
         const radius = map(radius_sig, radius_min, 0.5)

         const color_angle_offset = 1 / 3;
         let x = 0.5 + cos(angle + color_angle_offset) * radius + offset_x;
         let y = 0.5 + sin(angle + color_angle_offset) * radius + offset_y

         return { x, y };
      }

      const getGradient = (angle: number, brightness = 1) => {
         const color_f = tri(angle);
         const r = map(color_f, 1.0, 1.0);
         const g = map(color_f, 0.0, 0.5);
         const b = map(color_f, 0.5, 0.0);
         // const r = map(color_f, 0.5, 1.0) * brightness;
         // const g = map(color_f, 0.0, 0.5) * brightness;
         // const b = map(color_f, 1.0, 0.0) * brightness;
         return getColor(r, g, b);
      }

      const offset = 0.03;
      draw(ctx, layout, 0.06, 0, (angle) => ({ p: getP(angle, offset, offset * 2), color: getColor(0, 0, 0) }));
      draw(ctx, layout, 0.08, 0, (angle) => ({ p: getP(angle, 0, 0), color: getColor(0, 0, 0) }));
      draw(ctx, layout, 0.06, 1, (angle) => ({ p: getP(angle, 0, 0), color: getGradient(angle) }));

      // draw(ctx, layout, 0.06, 0, (angle) => ({ p: getP(angle, offset, offset * 2), color: getColor(1, 1, 1, 0.1) }));
      // draw(ctx, layout, 0.08, 0, (angle) => ({ p: getP(angle, 0, 0), color: getColor(1, 1, 1, 0.25) }));
      // draw(ctx, layout, 0.06, 1, (angle) => ({ p: getP(angle, 0, 0), color: getGradient(angle, 0) }));
      // draw(ctx, layout, 0.005, 1, (angle) => ({ p: getP(angle, 0, 0), color: getGradient(angle, 1.1) }));
   }

   const COUNT = 1000;
   function draw(ctx: CanvasRenderingContext2D, layout: Layout, lineWidth: number, mode: 0 | 1, getProps:
      (angle: number) => { p: { x: number, y: number }, color: string }
   ) {
      const { screenX, screenY, size } = layout;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = lineWidth * size;

      if (mode === 0) {
         ctx.beginPath();
         for (let i = 0; i < COUNT; i++) {
            let i_fract = i / COUNT

            let { p, color } = getProps(i_fract)
            ctx.strokeStyle = color;

            if (i === 0) ctx.moveTo(screenX(p.x), screenY(p.y));
            else ctx.lineTo(screenX(p.x), screenY(p.y))
         }
         ctx.closePath();
         ctx.stroke();
      }

      if (mode === 1) {
         for (let i = 0; i < COUNT; i++) {
            let i_fract1 = i / COUNT
            let i_fract2 = (i + 1) / COUNT

            let { p: p1, color } = getProps(i_fract1)
            let { p: p2 } = getProps(i_fract2)

            ctx.strokeStyle = color;

            ctx.beginPath();
            ctx.moveTo(screenX(p1.x), screenY(p1.y));
            ctx.lineTo(screenX(p2.x), screenY(p2.y))
            ctx.stroke();
         }
      }
   }


   if (REALTIME) {
      const tick_par = createParameter(0);
      createAnimationLoop(() => tick_par.set(t => mod(t + 1, FRAMES)));

      const canvas = engine.draw(WIDTH, HEIGHT, (ctx) => {
         const index = tick_par.get();
         const t = mod(index / FRAMES);
         animation(ctx, LAYOUT, t);
      });
      ui.createView(canvas, tick_par);
   }

   if (ANIMATION) {
      const tick_par = createParameter(0);
      createAnimationLoop((delta) => tick_par.set(t => mod(t + (delta / 1000) * FPS, FRAMES)));

      const canvas_cache = engine.animate(WIDTH, HEIGHT, FRAMES, (ctx, props) => {
         const { index } = props;
         const t = mod(index / FRAMES);
         animation(ctx, LAYOUT, t);
      });
      ui.createCacheView(canvas_cache, tick_par);
   }

   if (VIDEO) {
      const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
         const { index } = props;
         const t = mod(index / FRAMES);
         animation(ctx, LAYOUT, t);
      });
      ui.createVideo(video);
   }
});