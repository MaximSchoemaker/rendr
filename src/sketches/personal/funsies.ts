import { createAnimationLoop, createParameter, createSketch } from '../../rendr/rendr';
import { cosn, sinn, mod, lerp, tri, for_n, getLayout, Layout } from "../../rendr/utils"

const GLOBAL_FRAMES = 400;
const GLOBAL_FPS = 60;
const REFRESH_RATE = 120;

type Props = {
   ANIMATION: boolean,
   VIDEO: boolean,
}

export default createSketch<Props>((engine, ui, props) => {
   const { ANIMATION, VIDEO } = props;

   if (ANIMATION) {
      const WIDTH = 1080;
      const HEIGHT = 1080;
      const PAD = 0.15;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT, PAD);

      const FPS = REFRESH_RATE;
      const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;

      const frame_cache = engine.animate(WIDTH, HEIGHT, FRAMES, (ctx, props) => {
         const { index } = props;
         const t = (index / FRAMES) % 1;
         animation(ctx, t, LAYOUT)
      });

      const frame_par = createParameter(0);
      createAnimationLoop(() => frame_par.set(frame => (frame + 1) % FRAMES));

      ui.createCacheView(frame_cache, frame_par);
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
         animation(ctx, t, LAYOUT);
      });

      ui.createVideo(video);
   }
});

const COUNT = 20;
function animation(ctx: CanvasRenderingContext2D, t: number, layout: Layout) {
   for_n(COUNT, i => {
      const f = i / COUNT;
      const scene_t = mod(f + t);
      const scene_f = sinn(f);
      scene(ctx, scene_t, scene_f, layout);
   });
}

function scene(ctx: CanvasRenderingContext2D, t: number, f: number, layout: Layout) {
   const { screenX, screenY, size } = layout;

   const x1 = sinn(t);
   const x2 = cosn(t);

   const lineWidth = size * 50 / 1080

   const color_f = f;
   const g2_f = tri(f + t);
   const r = lerp(color_f, 0.5, 1);
   const g = lerp(color_f, 0, g2_f);
   const b = lerp(color_f, 1, 0);

   const color = `rgb(${r * 255}, ${g * 255}, ${b * 255})`
   const colorOutline = `rgb(${r * 200}, ${g * 200}, ${b * 200})`

   ctx.beginPath();
   ctx.moveTo(screenX(x1), screenY(1));
   ctx.lineTo(screenX(x2), screenY(0));

   ctx.lineCap = 'round';

   ctx.lineWidth = lineWidth + 5;
   ctx.strokeStyle = colorOutline;
   ctx.stroke();

   ctx.lineWidth = lineWidth;
   ctx.strokeStyle = color;
   ctx.stroke();
}