import { type Component, createSignal, untrack } from 'solid-js';
import styles from './App.module.css';
import { invoke } from '@tauri-apps/api/core';

import { Column, UI } from './ui/UI';
import { Engine, createAnimationLoop, createLoop, mount } from './rendr/rendr';

import master_sketch from './sketches/master_sketch';
import cattoy_sketch from './sketches/personal/cattoy';

import { lerp } from './rendr/utils';

const AVG_TIME_LERP = 0.01;
const TARGET_FPS = 60;

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const App: Component = () => {
  const target_time = 1000 / TARGET_FPS;

  const [avg_time, set_avg_time] = createSignal(target_time);
  const [avg_execution_time, set_avg_execution_time] = createSignal(0);
  const avg_draw_time = () => avg_time() - avg_execution_time();
  const [tauri_message, set_tauri_message] = createSignal('Tauri command not tested yet.');
  const [tauri_pending, set_tauri_pending] = createSignal(false);

  const isTauriRuntime = () => typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

  const testTauriCommand = async () => {
    if (!isTauriRuntime()) {
      set_tauri_message('Web mode detected: no Tauri runtime available.');
      return;
    }

    set_tauri_pending(true);
    try {
      const response = await invoke<string>('greet', { name: 'Rendr' });
      set_tauri_message(response);
    } catch (error) {
      set_tauri_message(`Command failed: ${String(error)}`);
    } finally {
      set_tauri_pending(false);
    }
  };

  const scheduleEngine = (engine: Engine) => {
    const loop = createAnimationLoop(delta => {
      if (delta > 1000) return; // skip large deltas (e.g. when tab is inactive)

      const draw_time = untrack(avg_draw_time);
      const max_execution_time = Math.max(1, target_time - draw_time);

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
      <div style={{ display: 'flex', 'flex-direction': 'row', gap: '4px', 'align-items': 'center', 'text-align': 'left' }}>
        <button
          onClick={() => {
            void testTauriCommand();
          }}
          disabled={tauri_pending()}
        >
          {tauri_pending() ? 'Testing command...' : 'Test Tauri command'}
        </button>
        <div style={{ ...hudStyle, flex: '2' }}>tauri: {tauri_message()}</div>
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