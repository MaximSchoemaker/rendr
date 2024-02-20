import rendr, { createParameter, createCache, createCanvas } from "../rendr/rendr.js";
import { Draw2dContext } from "../rendr/library/Draw2d.js";
import { n_arr, map, invCosn, mod } from "../rendr/library/Utils.js"

const SCALE = 1;
const WIDTH = 1080 * SCALE;
const HEIGHT = 1080 * SCALE;
const FRAMES = 500;

const sketch = rendr.createSketch(sketch => (tick_par) => {

   const boids_count_par = createParameter(0, "boids_count_par");

   const repulsion_par = createParameter(0, "repulsion_par");
   const attraction_par = createParameter(0, "attraction_par");

   const repulsion_dist_par = createParameter(0, "repulsion_dist_par");
   const attraction_dist_par = createParameter(0, "attraction_dist_par");

   const friction_par = createParameter(0, "friction_par");
   const max_speed_par = createParameter(0, "max_speed_par");

   const backbuffer = createCanvas(WIDTH, HEIGHT);

   const initial_boids = sketch.update([], () => {
      const count = boids_count_par.get();
      return n_arr(count, (i) => ({
         x: Math.random(),
         y: Math.random(),
         vel_x: (Math.random() * 2 - 1) * 0.01,
         vel_y: (Math.random() * 2 - 1) * 0.01,
      }));
   });

   const boids_cache = sketch.simulate(initial_boids, FRAMES, (boids) => {
      const repulsion_f = repulsion_par.get();
      const attraction_f = attraction_par.get();
      const repulsion_dist = repulsion_dist_par.get();
      const attraction_dist = attraction_dist_par.get();
      const friction = friction_par.get();
      const max_speed = max_speed_par.get();

      boids.forEach(boid => {
         let avg_pos = { x: 0, y: 0 };
         let avg_count = 0;
         boids.forEach(boid2 => {
            if (boid === boid2) return;

            const dif = {
               x: boid.x - boid2.x,
               y: boid.y - boid2.y
            };
            const dist = Math.sqrt(Math.pow(dif.x, 2) + Math.pow(dif.y, 2));
            if (dist <= repulsion_dist) {
               const repulsion = Math.pow(1 - dist / repulsion_dist, 1 / repulsion_f);
               boid.vel_x += dif.x * repulsion;
               boid.vel_y += dif.y * repulsion;
            }

            if (dist <= attraction_dist) {
               // const attraction = attraction_f * Math.pow(dist / attraction_dist, 2);
               // boid.vel_x -= dif.x * attraction;
               // boid.vel_y -= dif.y * attraction;

               avg_pos.x += boid2.x;
               avg_pos.y += boid2.y;
               avg_count++;
            }
         });

         {
            avg_pos.x /= avg_count;
            avg_pos.y /= avg_count;

            const dif = {
               x: boid.x - avg_pos.x,
               y: boid.y - avg_pos.y
            };
            const dist = Math.sqrt(Math.pow(dif.x, 2) + Math.pow(dif.y, 2));
            if (dist <= attraction_dist) {
               const attraction = attraction_f * Math.pow(dist / attraction_dist, 1 / attraction_f);
               boid.vel_x -= dif.x * attraction;
               boid.vel_y -= dif.y * attraction;
            }
         }

         const speed = Math.sqrt(Math.pow(boid.vel_x, 2) + Math.pow(boid.vel_y, 2));
         if (speed > max_speed) {
            const coef = max_speed / speed;
            boid.vel_x *= coef;
            boid.vel_y *= coef;
         }

         boid.vel_x *= friction;
         boid.vel_y *= friction;

         boid.x = mod(boid.x + boid.vel_x);
         boid.y = mod(boid.y + boid.vel_y);
      });
   }, {
      //  max_queue_length: 10
   });

   const frame_cache = sketch.animate(FRAMES, (tick, t) => {
      const view = backbuffer;
      const boids = boids_cache.get(tick);
      if (!boids) return null;

      const ctx = new Draw2dContext(view);
      ctx.clear("black");
      boids.forEach(p => {
         ctx.circle(p.x * WIDTH, p.y * HEIGHT, 2, { beginPath: true, fill: true, fillStyle: "#F80" });
      });
      return view;
   });

   return {
      boids_count_par,
      friction_par, max_speed_par,
      repulsion_par, attraction_par,
      repulsion_dist_par, attraction_dist_par,
      boids_cache, frame_cache,
   }
});

export default rendr.createSetup("/sketches/boids.js", createUI => {

   const tick_par = createParameter(0, "tick");
   const running_par = createParameter(true, "running");

   const {
      boids_count_par,
      friction_par, max_speed_par,
      repulsion_par, attraction_par,
      repulsion_dist_par, attraction_dist_par,
      boids_cache, frame_cache,
   } = sketch.init(tick_par);

   createUI(ui => {
      ui.createContainer(ui => {
         ui.createWindow(ui => {
            // ui.createParameterNumber("tick", tick_par, { min: 0, max: FRAMES - 1, step: 1 });
            ui.createParameterNumber("boids count", boids_count_par, { min: 0, max: 5000, step: 1 });
            ui.createParameterNumber("repulsion", repulsion_par, { min: 0, max: 1, step: 0.01 });
            ui.createParameterNumber("repulsion dist", repulsion_dist_par, { min: 0, max: .1, step: 0.001 });
            ui.createParameterNumber("attraction", attraction_par, { min: 0, max: 1, step: 0.01 });
            ui.createParameterNumber("attraction dist", attraction_dist_par, { min: 0, max: .1, step: 0.001 });
            ui.createParameterNumber("friction", friction_par, { min: 0.9, max: 1, step: 0.001 });
            ui.createParameterNumber("max_speed", max_speed_par, { min: 0, max: 0.02, step: 0.0001 });
         });

         ui.createViewContainer(ui => {
            ui.createCacheView(tick_par, running_par, frame_cache);
         });

         ui.createTimeline(FRAMES, tick_par, running_par, [
            frame_cache,
            boids_cache,
         ].filter(c => !!c));
      });
   })

});