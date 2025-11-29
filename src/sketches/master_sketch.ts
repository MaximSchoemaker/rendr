import { createSketch, Engine } from "../rendr/rendr";
import { fillGrid } from "../rendr/utils";

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
import stepper from "./personal/stepper";
import twistie from "./personal/twistie";
import growth from "./personal/growth";

export default createSketch((master_engine, ui) => {
   const sketches = [
      // test_ui,
      // test_draw,

      // test_update_draw,
      // test_construct_draw,
      // test_simulate_draw,

      // test_generate,
      // test_construct_generate,
      // test_simulate_generate,

      // witness,
      // langton,

      // test_animate,
      // funsies,
      // funsies2,
      // cattoy,
      // stepper
      // twistie,
      growth,
   ];

   const props = {
      // REALTIME: true,
      // ANIMATION: true,
      VIDEO: true,

      REFRESH_RATE: 120,
   }

   function layout1() {
      ui.createColumn(ui => {
         let engines: Engine[];
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
         let engines: Engine[];
         ui.createRow(ui => {
            engines = sketches.map(sketch => {
               let engine: Engine | null = null;
               ui.createRow(ui => engine = master_engine.mount(sketch, ui, props));
               if (!engine) throw new Error("Engine failed to mount");
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
               let engine: Engine | null = null;
               ui.createRow(ui => engine = master_engine.mount(sketch, ui, props));
               if (!engine) throw new Error("Engine failed to mount");
               ui.createStatus(engine, 8,
                  { "max-height": "25%" }
               );
            },
               {
                  outline: "1px solid var(--foreground-color)",
                  "outline-offset": "-1px",
                  padding: "4px",
               }
            );
         });
      });
   }

   // layout1();
   // layout2();
   layout3();
});

