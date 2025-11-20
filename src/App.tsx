import { type Component, createSignal, untrack } from 'solid-js';
import styles from './App.module.css';

import { Column, UI } from './UI';
import { Engine, createLoop, mount } from './rendr/rendr';

import master_sketch from './sketches/master_sketch';
import cattoy_sketch from './sketches/personal/cattoy';

import { lerp } from './rendr/utils';

const AVG_TIME_LERP = 0.01

const App: Component = () => {
  const max_time = 1000 / 30;

  const [avg_time, set_avg_time] = createSignal(max_time);
  const [avg_execution_time, set_avg_execution_time] = createSignal(max_time);
  const avg_draw_time = () => avg_time() - avg_execution_time();

  const scheduleEngine = (engine: Engine) => {
    const loop = createLoop(delta => {
      const draw_time = untrack(avg_draw_time);
      const max_execution_time = max_time - draw_time;

      const start_time = performance.now();
      engine.scheduler.execute(max_execution_time);
      const execution_time = performance.now() - start_time;

      set_avg_execution_time(avg_execution_time => lerp(AVG_TIME_LERP, avg_execution_time, execution_time));
      set_avg_time(avg_time => lerp(AVG_TIME_LERP, avg_time, delta));
    });

    addEventListener("keydown", evt => {
      if (evt.key === " ")
        loop.toggle();
    });
  }

  const setup = (ui: UI) => {
    const engine = mount(master_sketch, ui);
    // const engine = mount(cattoy_sketch, ui, { ANIMATION: true, VIDEO: true, REALTIME: true });
    scheduleEngine(engine);
  }

  const hudStyle = {
    flex: 1,
    "border": "1px solid currentColor",
    "padding-left": "2px",
    "color": "var(--accent-color-2)",
  }

  return (
    <div class={styles.App}>
      <div style={{
        // 'width': '100%',
        display: 'flex',
        'flex-direction': 'row',
        'gap': '4px',
        'text-align': 'left',
      }}>
        <div style={hudStyle}>fps: {Math.round(1000 / avg_time())}</div>
        <div style={hudStyle}>exec: {avg_execution_time().toString().slice(0, 5).padEnd(5, "0")}ms</div>
        <div style={hudStyle}>draw: {avg_draw_time().toString().slice(0, 5).padEnd(5, "0")}ms</div>
      </div>
      <Column create={setup}
        style={{
          background: 'var(--background-color)',
          "flex": "1",
        }} />
    </div>
  );
};

export default App;