import { type Component, JSX, createSignal, } from 'solid-js';
import { download_url } from '../rendr/utils';
import styles from './UI.module.css';

type CanvasProps = {
    canvas: HTMLCanvasElement
    style?: JSX.CSSProperties
}

export const Canvas: Component<CanvasProps> = (props) => {

    const [recording, set_recording] = createSignal(false);
    const [fullscreen, setFullscreen] = createSignal(false);

    props.canvas.className = styles.ViewCanvas;
    const aspect_ratio = props.canvas.width / props.canvas.height;

    function onKeyDown(evt: KeyboardEvent) {
        switch (evt.key) {
            case "Enter":
                onScreenshot();
                break;
            case "f":
                onFullscreen();
                break;
        }
    }

    function onDoubleClick(evt: MouseEvent) {
        onFullscreen();
    }


    function onScreenshot() {
        set_recording(true);
        setTimeout(() => {
            screenshot();
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

    function screenshot(name = "screenshot") {
        const image_blob_url = props.canvas.toDataURL("image/png", 1);

        const { width, height } = props.canvas;
        const date = new Date().toLocaleString();
        const file_name = `${name} - ${date} - ${width}x${height}.png`;

        download_url(image_blob_url, file_name);
    }

    const className = () => `${styles.ViewContainer} ${fullscreen() ? styles.fullscreen : ''}`;

    return <div class={className()} tabIndex={0} onKeyDown={onKeyDown} onDblClick={onDoubleClick} style={{
        "aspect-ratio": fullscreen() ? undefined : aspect_ratio,
        ...props.style,
    }}>
        <div class={styles.recordIcon} hidden={!recording()}>🔴</div>
        {props.canvas}
    </div>;
}