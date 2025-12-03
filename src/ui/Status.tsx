import { type Component, For, JSX, onCleanup, createSignal, Show } from 'solid-js';
import { Engine, Task, createAnimationLoop } from '../rendr/rendr';
import { floorTo } from '../rendr/utils';

type StatusProps = {
    engine: Engine
    max_tasks?: number
    style?: JSX.CSSProperties
}

export const Status: Component<StatusProps> = (props) => {

    const tasks = props.engine.scheduler.tasks;

    const [hidden, setHidden] = createSignal(false);

    function onKeyDown(evt: KeyboardEvent) {
        switch (evt.key) {
            case "h":
                setHidden(h => !h);
        }
    }

    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));

    const show_task = () => tasks.slice(0, props.max_tasks)

    return (
        <Show when={!hidden()}>
            <div style={{
                // "flex": "1",
                "display": "flex",
                "flex-direction": "column",
                "justify-content": "flex-end",
                "gap": "2px",
                // "height": "0",
                "width": "100%",
                // "outline": "1px solid orange",
                // "outline-offset": "-1px",
                "align-self": "flex-start",
                // "height": "32px",
                // "overflow-y": "auto",
                ...props.style,
            }}>
                <For each={show_task()}>{task =>
                    <div style={{
                        "display": "flex",
                        "width": "100%",
                        "height": "15px",
                        "min-height": "0px",
                        "min-width": "0px",
                        "flex": "0 1 auto",
                        "gap": "2px",
                    }}>
                        <TaskProgress task={task} />
                        <TaskPerformance task={task} />
                    </div>
                }</For>
            </div>
        </Show>
    );
}

type TaskProgressProps = {
    task: Task
}

export const TaskProgress: Component<TaskProgressProps> = (props) => {

    const width = 100;
    const height = 1;
    let el: HTMLCanvasElement;

    let prev_progress = -1;
    createAnimationLoop(() => {
        const ctx = el.getContext("2d");
        if (!ctx) return;

        const progress = floorTo(props.task.progress(), width);
        if (progress === prev_progress) return;
        prev_progress = progress;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgb(0, 255, 128)";
        ctx.beginPath();
        ctx.rect(0, 0, progress * width, height);
        ctx.fill();
    });

    return <canvas ref={ref => el = ref} width={width} height={height} style={{
        "flex": "1",
        "width": "100%",
        "height": "100%",
        "min-width": "0",
        "min-height": "0",
        // "max-height": "15px",
        "image-rendering": "pixelated",
        // "background-color": "var(--background-color)",
        "outline": "1px solid var(--foreground-color)",
        "outline-offset": "-1px",
    }} />
}


type TaskPerformanceProps = {
    task: Task
}

export const TaskPerformance: Component<TaskPerformanceProps> = (props) => {

    const size = 100;
    const height = 10;
    let el: HTMLCanvasElement;

    let buffer = new Array(size).fill(0);
    let head = 0;
    let last_run_time = 0;
    createAnimationLoop((delta) => {
        const ctx = el.getContext("2d");
        if (!ctx) return;

        const { run_time } = props.task;
        buffer[head] = (run_time - last_run_time) / delta;
        last_run_time = run_time;
        head = (head + 1) % size;

        ctx.clearRect(0, 0, size, height);
        ctx.fillStyle = "rgb(255, 0, 128)";

        for (let i = 0; i < size; i++) {
            const index = (i + head) % size;
            const value = buffer[index];
            if (value === 0) continue;

            ctx.beginPath();
            ctx.rect(i, height, 1, -Math.ceil(value * height));
            ctx.fill();
        }
    });

    return <canvas ref={ref => el = ref} width={size} height={height} style={{
        "flex": "1",
        "width": "100%",
        "height": "100%",
        // "max-width": "100%",
        // "height": height + "px",
        "min-width": "0",
        "min-height": "0",
        "image-rendering": "pixelated",
        // "background-color": "var(--background-color)",
        "outline": "1px solid var(--foreground-color)",
        "outline-offset": "-1px",
    }} />
}
