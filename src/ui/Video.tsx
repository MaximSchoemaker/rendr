import { type Component, JSX } from 'solid-js';
import styles from './UI.module.css';

type VideoProps = {
    video: HTMLVideoElement
    style?: JSX.CSSProperties
}

export const Video: Component<VideoProps> = (props) => {

    props.video.className = styles.ViewCanvas;
    props.video.style.width = props.video.width + 'px';
    props.video.style.height = props.video.height + 'px';

    const aspect_ratio = props.video.width / props.video.height;

    return <div class={styles.ViewContainer} tabIndex={0} style={{
        "aspect-ratio": aspect_ratio,
        ...props.style,
    }}>
        {props.video}
    </div>;
}