import { createAnimationLoop, createAnimationLoopParameter, createParameter, createSketch } from '../../rendr/rendr';
import { map, cosn, sinn, mod, lerp, clamp, tri, for_n, getLayout, Layout } from "../../rendr/utils"


const GLOBAL_FRAMES = 400;
const GLOBAL_FPS = 60;
const REFRESH_RATE = 120;

type Props = {
   REALTIME?: boolean,
   ANIMATION?: boolean,
   VIDEO?: boolean,
   REFRESH_RATE?: number
}

export default createSketch<Props>((engine, ui, props) => {
   const { REALTIME, ANIMATION, VIDEO, REFRESH_RATE = 60 } = props;

   if (REALTIME || ANIMATION) {
      const WIDTH = 1080;
      const HEIGHT = 1080;
      const PAD = 0.15;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT, PAD);

      const FPS = REFRESH_RATE;
      const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;

      const frame_par = createAnimationLoopParameter(FRAMES, FPS);

      if (REALTIME) {
         const canvas = engine.draw(WIDTH, HEIGHT, (ctx, props) => {
            const frame = frame_par.get();
            const t = mod(frame / FRAMES);
            animation(ctx, t, LAYOUT)
         });
         ui.mountCanvas(canvas, frame_par);
      }

      if (ANIMATION) {
         const cahce = engine.animate(WIDTH, HEIGHT, FRAMES, (ctx, props) => {
            const { index } = props;
            const t = mod(index / FRAMES);
            animation(ctx, t, LAYOUT)
         });
         ui.mountCanvasAnimation(cahce, frame_par);
      }
   }

   if (VIDEO) {
      const WIDTH = 1080;
      const HEIGHT = 1920;
      const PAD = 0.15;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT, PAD);

      const FPS = 60;
      const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;
      const LOOP = 2;

      const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOP, (ctx, props) => {
         const { index } = props;
         const t = (index / FRAMES) % 1;
         animation(ctx, t, LAYOUT)
      });

      ui.mountVideo(video);
   }
});

const COUNT = 400;
function animation(ctx: CanvasRenderingContext2D, t: number, layout: Layout) {
   for_n(COUNT, i => {
      const f = i / COUNT;
      const scene_t = mod(f + t * 2);
      const scene_f = sinn(f);
      scene(ctx, scene_t, scene_f, t, 500, 3, layout);
   });
   for_n(COUNT, i => {
      const f = i / COUNT;
      const scene_t = mod(f + t * 2);
      const scene_f = sinn(f);
      scene(ctx, scene_t, scene_f, t, 255, 0, layout);
   });
}

const WRAPS = 10;
function scene(ctx: CanvasRenderingContext2D, t: number, f: number, global_t: number, color_mult: number, radius_offset: number, layout: Layout) {
   const x1 = sinn(t);
   const y1 = 1;

   const x2 = cosn(t);
   const y2 = 0;

   const lineWidth = layout.getSize(50 / 1080);

   const color_f = f;
   // const color_f = tri(f);
   const g2_f = tri(f + t);
   const r = lerp(color_f, 0.5, 1);
   const g = lerp(color_f, 0, g2_f);
   const b = lerp(color_f, 1, 0);

   const getC = (v: number) => clamp(v * color_mult, 0, 255);
   const color = `rgb(${getC(r)}, ${getC(g)}, ${getC(b)})`

   // const count_2_t = 1;
   const count_2_t = sinn(global_t);
   const count_2 = count_2_t * WRAPS + 1;

   for (let i = 0; i < count_2; i++) {
      const f_2 = i / count_2;
      const t_f = sinn(f_2 + t + global_t);
      const x = lerp(t_f, x1, x2);
      const y = lerp(t_f, y1, y2);

      ctx.beginPath();
      ctx.arc(layout.getX(x), layout.getY(y), lineWidth / 2 + radius_offset, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
   }
}