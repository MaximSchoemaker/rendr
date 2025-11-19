import { createSketch } from "../rendr/rendr";

import test_ui from "./tests/test_ui";
import test_draw from "./tests/test_draw";
import test_update_draw from "./tests/test_update_draw";
import test_construct_draw from "./tests/test_construct_draw";
import test_generate from "./tests/test_generate";
import test_construct_generate from "./tests/test_construct_generate";
import test_simulate_draw from "./tests/test_simulate_draw";
import test_simulate_generate from "./tests/test_simulate_generate";
import test_animate from "./tests/test_animate";

import langton from "./personal/langton";
import cattoy from "./personal/cattoy";
import funsies from "./personal/funsies";
import funsies2 from "./personal/funsies2";
import witness from "./personal/witness";
import { fillGrid } from "../rendr/utils";

export default createSketch((master_engine, ui) => {
   const sketches = [
      test_ui,
      test_draw,

      test_update_draw,
      test_construct_draw,
      test_simulate_draw,

      test_generate,
      test_construct_generate,
      test_simulate_generate,

      test_animate,
      langton,
      funsies,
      funsies2,
      cattoy,
      witness,
   ];

   const props = {
      ANIMATION: true,
      // VIDEO: true,
      // REALTIME: true,
   }

   function layout1() {
      ui.createColumn(ui => {
         let engines;
         ui.createRow(ui => {
            engines = sketches.map(sketch =>
               master_engine.mount(sketch, ui, props)
            );
         });
         ui.createRow(ui =>
            engines.forEach(engine => ui.createStatus(engine, 8)),
            { flex: "0 1 auto" }
         );
      });
   }

   function layout2() {
      ui.createColumn(ui => {
         let engines;
         ui.createRow(ui => {
            engines = sketches.map(sketch => {
               let engine;
               ui.createRow(ui => {
                  engine = master_engine.mount(sketch, ui, props)
               });
               return engine;
            });
         });
         ui.createRow(ui =>
            engines.forEach(engine => ui.createStatus(engine, 8)),
            { flex: "0 1 auto" }
         );
      });
   }

   function layout3() {
      const { rows, cols } = fillGrid(sketches.length, window.innerWidth, window.innerHeight);

      ui.createGrid(rows, cols, ui => {
         sketches.forEach(sketch => {
            ui.createColumn(ui => {
               let engine;
               ui.createRow(ui => {
                  engine = master_engine.mount(sketch, ui, props);
               });
               ui.createStatus(engine, 8,
                  { "max-height": "25%" }
               );
            },
               {
                  outline: "1px solid var(--foreground-color)",
                  outlineOffset: "-1px",
                  padding: "5px"
               }
            );
         });
      });
   }

   // layout1();
   // layout2();
   layout3();
});

