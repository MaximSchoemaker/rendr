import { createAnimationLoopParameter, createSketch } from '../../rendr/rendr';
import { cosn, lerp, mod, sinn, sin, getLayout, Layout } from '../../rendr/utils';

const GLOBAL_FRAMES = 400;
const GLOBAL_FPS = 60;

type Props = {
   REALTIME?: boolean,
   ANIMATION?: boolean,
   VIDEO?: boolean,
   REFRESH_RATE?: number
}

export default createSketch((engine, ui, props: Props) => {
   const { REALTIME, ANIMATION, VIDEO, REFRESH_RATE = 60 } = props;

   if (ANIMATION || REALTIME) {
      const WIDTH = 1080;
      const HEIGHT = 1080;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT);

      const FPS = REFRESH_RATE;
      const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;

      const frame_par = createAnimationLoopParameter(FRAMES, FPS);

      if (REALTIME) {
         const canvas = engine.draw(WIDTH, HEIGHT, (ctx, props) => {
            const frame = frame_par.get();
            const t = mod(0.75 + frame / FRAMES);
            scene(ctx, t, LAYOUT)
         });
         ui.createView(canvas);
      }

      if (ANIMATION) {
         const cache = engine.animate(WIDTH, HEIGHT, FRAMES, (ctx, props) => {
            const { index } = props;
            const t = mod(0.75 + index / FRAMES);
            scene(ctx, t, LAYOUT)
         });
         ui.createCacheView(cache, frame_par);
      }

   }

   if (VIDEO) {
      const WIDTH = 1080;
      const HEIGHT = 1920;
      const LAYOUT = getLayout("fit", WIDTH, HEIGHT);

      const FPS = 60;
      const FRAMES = GLOBAL_FRAMES * FPS / GLOBAL_FPS;
      const LOOP = 2;

      const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOP, (ctx, props) => {
         const { index } = props;
         const t = mod(0.75 + index / FRAMES);
         scene(ctx, t, LAYOUT)
      });
      ui.createVideo(video);
   }
});

function scene(ctx: CanvasRenderingContext2D, t: number, layout: Layout) {
   const count = 1000;
   for (let i = 0; i < count; i++) {
      const f = mod(i / count);

      const x = lerp(cosn(t + f), 0.1, 0.9);
      const y = lerp(sinn((t + f) * 3) + sin(t + x), 0.4, 0.6);
      const radius = 0.05 * sinn(f);

      const color_f = sinn(t + f)
      const r = lerp(color_f, 255, 128);
      const g = lerp(color_f, 50, 0);
      const b = lerp(color_f, 0, 255);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.globalAlpha = mod(f - t)
      ctx.beginPath();
      ctx.arc(layout.getX(x), layout.getY(y), layout.getSize(radius), 0, Math.PI * 2);
      ctx.fill();
   }
}