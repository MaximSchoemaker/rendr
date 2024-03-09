import { useTransition, type Component, createSignal, untrack } from 'solid-js';
import styles from './App.module.css';

import { Container, Row, Column, UI } from './ui';
import { Render, createAnimationLoop, createLoop, createRender, mountSketch } from './rendr/rendr';

import master_sketch from './sketches/master_sketch';

import test_ui from './sketches/tests/test_ui';
import test_draw from './sketches/tests/test_draw';
import test_update from './sketches/tests/test_update_draw';
import test_construct from './sketches/tests/test_construct_draw';
import test_generate from './sketches/tests/test_generate';
import test_construct_generate from './sketches/tests/test_construct_generate';

import { floorTo, lerp } from './rendr/utils';

const App: Component = () => {
  const max_time = 1000 / 60;

  const [avg_time, set_avg_time] = createSignal(max_time);
  const [avg_execution_time, set_avg_execution_time] = createSignal(max_time);
  const [avg_fps, set_avg_fps] = createSignal(0);
  const avg_draw_time = () => avg_time() - avg_execution_time();

  createLoop(() => {
    set_avg_fps(1000 / avg_time());
  }, 500);

  const scheduleRender = (render: Render) => {
    const loop = createLoop(delta => {
      const draw_time = untrack(avg_draw_time);
      const max_execution_time = max_time - draw_time;

      const start_time = performance.now();
      render.scheduler.execute(max_execution_time);
      const execution_time = performance.now() - start_time;

      set_avg_execution_time(avg_execution_time => lerp(0.1, avg_execution_time, execution_time));
      set_avg_time(avg_time => lerp(0.1, avg_time, delta));
    });

    addEventListener("keydown", evt => {
      if (evt.key === " ")
        loop.toggle();
    });
  }

  const setup = (ui: UI) => {
    const render = mountSketch(master_sketch, ui);
    scheduleRender(render);

    // const render = createRender();
    // test_ui(render, ui);
    // test_draw(render, ui);
    // test_update(render, ui);
    // test_generate(render, ui);
    // test_construct(render, ui);
    // test_construct_generate(render, ui);
    // scheduleRender(render);
  }

  return (
    <div class={styles.App}>
      <h2>fps: {Math.round(1000 / avg_time())} ({Math.round(avg_fps())})</h2>
      <h2>execution time: {(floorTo(avg_execution_time(), 0.01)).toString().slice(0, 5).padEnd(5, "0")}</h2>
      <h2>draw time: {(floorTo(avg_draw_time(), 0.01)).toString().slice(0, 5).padEnd(5, "0")}</h2>
      <Row create={setup}
        style={{
          "width": "calc(100% - 10px)",
          "height": "calc(100% - 10px)",
          "max-width": "calc(100% - 10px)",
          "max-height": "calc(100% - 10px)",
          "flex": "1",
          "padding": "5px",
        }} />
    </div>
  );
};

export default App;