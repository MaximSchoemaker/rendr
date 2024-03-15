import { createParameter, createSketch, createRender } from '../rendr/rendr';

import test_ui from './tests/test_ui';
import test_draw from './tests/test_draw';
import test_update_draw from './tests/test_update_draw';
import test_construct_draw from './tests/test_construct_draw';
import test_generate from './tests/test_generate';
import test_construct_generate from './tests/test_construct_generate';
import test_simulate_draw from './tests/test_simulate_draw';
import test_simulate_generate from './tests/test_simulate_generate';
import test_animate from './tests/test_animate';
import langton from './langton';


export default createSketch((render, ui) => {

   const sketches = [
      // test_ui,
      // test_draw,

      // test_update_draw,
      // test_construct_draw,
      // test_simulate_draw,

      // test_generate,
      // test_construct_generate,
      // test_simulate_generate,

      // test_animate,

      langton
   ]

   let sketches_renders;

   ui.createColumn(ui => {
      ui.createRow(ui => {
         sketches_renders = sketches.map((sketch, i) => {
            const sketch_render = render.mountSketch(sketch, ui)
            if (sketch !== test_ui) return sketch_render;
         });
      });
      ui.createRow(ui => {
         sketches_renders.forEach(render => render && ui.createStatus(render));
      }, { "height": "auto", "flex": "unset" });
   });
});