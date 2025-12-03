import { type Component, JSX, createMemo, createSignal } from 'solid-js';
import { Cache, Parameter } from '../rendr/rendr';
import { download_url } from '../rendr/utils';
import styles from './UI.module.css';
import "../libs/video-builder";

declare class VideoBuilder {
    constructor(config: { w: number, h: number, fps: number, quality: number })
    addCanvasFrame(canvas: HTMLCanvasElement | OffscreenCanvas): void
    finish(onFinish: (video_blob_url: string) => void): void
    frameList: Blob[]
}

type CanvasAnimationProps = {
    cache: Cache<HTMLCanvasElement>
    frame_par: Parameter<number>
    style?: JSX.CSSProperties
}

export const CanvasAnimation: Component<CanvasAnimationProps> = (props) => {

    const [aspect_ratio, set_aspect_ratio] = createSignal(1);
    const [recording, set_recording] = createSignal(false);
    const [fullscreen, setFullscreen] = createSignal(false);

    const canvas = createMemo(() => {
        const canvas = props.cache.getLatestSafe(Math.floor(props.frame_par.getSafe() ?? 0))
        // const canvas = props.cache.getLatestSafe(props.cache.count)
        if (!canvas) return null;

        canvas.className = styles.ViewCanvas;
        set_aspect_ratio(canvas.width / canvas.height);

        return canvas;
    });

    function onKeyDown(evt: KeyboardEvent) {
        switch (evt.key) {
            case "Enter":
                onRecord();
                break;
            case "f":
                onFullscreen();
                break;
        }
    }

    function onDoubleClick(evt: MouseEvent) {
        onFullscreen();
    }

    function onRecord() {
        set_recording(true);
        setTimeout(() => {
            record();
            set_recording(false);
        }, 5);
    }

    function onFullscreen(value?: boolean) {
        if (value === undefined) {
            setFullscreen(fs => !fs);
        } else {
            setFullscreen(value);
        }
        if (fullscreen()) window.document.body.requestFullscreen();
        else document.exitFullscreen();
    }

    function record(name = "recording", quality = 1, fps = 60) {
        const { cache } = props;

        const first_frame = cache.getSafe(0);
        if (!first_frame) { console.warn("cache does not have a frame at index 0", cache); return; }

        const { width, height } = first_frame;
        const date = new Date().toLocaleString();
        const file_name = `${name} - ${date} - Q${quality} - FPS_${fps} - ${width}x${height}.avi`;

        console.log(
            "🔴 %crecording...", "color: #00FF88", "\n",
            "name:", name, "\n",
            "quality:", quality, "\n",
            "fps:", fps, "\n",
            "file_name:", file_name,
        );

        const video_builder = new VideoBuilder({ w: width, h: height, fps, quality });

        for (let i = 0; i < cache.count; i++) {
            const frame = cache.getSafe(i);
            if (!frame) continue;
            video_builder.addCanvasFrame(frame);
        }

        console.log(
            "🔨 %cbuilding...", "color: #00FF88", "\n",
            "frames:", video_builder.frameList.length
        );

        video_builder.finish((video_blob_url: string) => {
            console.log(
                "🎉 %cdone!", "color: #00FF88", "\n",
                file_name, "\n",
                video_blob_url
            );
            download_url(video_blob_url, file_name)
        });
    }


    const className = () => `${styles.ViewContainer} ${fullscreen() ? styles.fullscreen : ''}`;

    return <div class={className()} tabIndex={0} onKeyDown={onKeyDown} onDblClick={onDoubleClick} style={{
        "aspect-ratio": fullscreen() ? undefined : aspect_ratio(),
        "position": fullscreen() ? undefined : "relative",
        ...props.style,
    }}>
        <div class={styles.recordIcon} hidden={!recording()}>🔴</div>
        <div style={{ inset: "0", "position": "absolute" }} ></div>
        {canvas()}
    </div>;
}