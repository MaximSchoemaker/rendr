
import { createAnimationFrameParameter, createSketch } from "../../rendr/rendr";
import { angle_diff, clamp, cos, createColor, createHSL, getLayout, inv_cosn, Layout, lerp, lerpColor, map, mod, n_arr, sin, sinn } from "../../rendr/utils";

const GLOBAL_FRAMES = 1501;
const GLOBAL_FPS = 60;

// ... square ...
// const WIDTH = 1080;
// const HEIGHT = 1080;

// ... portraid ...
// const WIDTH = 1080;
// const HEIGHT = 1920;

// ... landscape ...
// const WIDTH = 1920;
// const HEIGHT = 1080;

// ... fit screen ...
const WIDTH = window.outerWidth;
const HEIGHT = window.outerHeight;

const PAD = 0.01;
const LAYOUT = getLayout("fit", WIDTH, HEIGHT, PAD);

// ... video ...
const LOOPS = 1;

const FFT_SIZE = 1024;
const BUFFER_SIZE = 64;


type Props = {
    REALTIME?: boolean;
    ANIMATION?: boolean;
    VIDEO?: boolean;
}

type RingBuffer = ReturnType<typeof makeRingBuffer>;

const makeRingBuffer = (size: number) => {
    const buffer = new Array(size).fill(0);
    let index = 0;

    const push = (item: number) => {
        buffer[index] = item;
        index = mod(index + 1, size);
    }

    const get = (i: number) => {
        return buffer[mod(index + i, size)];
    }

    return {
        get,
        push,
        size,
        buffer,
    }
}

export default createSketch<Props>((engine, ui, props) => {
    const { REALTIME, ANIMATION, VIDEO } = props;

    const FRAMES = GLOBAL_FRAMES;
    const FPS = GLOBAL_FPS;

    const frame_par = createAnimationFrameParameter(FRAMES * LOOPS, FPS);

    const frequencyArray = new Uint8Array(FFT_SIZE / 2);
    const waveformArray = new Uint8Array(FFT_SIZE);
    let getFrequency = () => frequencyArray;
    let getWaveform = () => waveformArray;
    (async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const mic = devices.find(device => device.kind === "audioinput");
            console.log("Using microphone:", mic?.label || "Unknown");

            if (!mic) throw new Error("No microphone found");

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: mic.deviceId,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            console.log("Microphone access granted");

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = FFT_SIZE;

            // analyser.minDecibels = -90;
            // analyser.maxDecibels = -10;
            analyser.smoothingTimeConstant = 0;
            // console.log(analyser.minDecibels, analyser.maxDecibels);

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            getFrequency = () => {
                analyser.getByteFrequencyData(frequencyArray);
                return frequencyArray;
            };

            getWaveform = () => {
                analyser.getByteTimeDomainData(waveformArray);
                return waveformArray;
            }
        } catch (err) {
            console.warn("Microphone access denied:", err);
        }
    })();

    if (REALTIME) {
        const canvas = engine.draw(WIDTH, HEIGHT, (ctx, props) => {
            const { width, height } = props;

            // clear screen
            ctx.fillStyle = createColor(0);
            ctx.fillRect(0, 0, width, height);

            const index = frame_par.get();
            const t = mod(index / FRAMES);

            const frequency = getFrequency();
            const waveform = getWaveform();
            scene(ctx, t, frequency, waveform, LAYOUT);
        })
        ui.mountCanvas(canvas);
    }

    // if (ANIMATION) {
    //     const animation = engine.animate(WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
    //         const { index } = props;
    //         const t = mod(index / FRAMES);
    //         scene(ctx, t, LAYOUT);
    //     })
    //     ui.mountCanvasAnimation(animation, frame_par);
    // }

    // if (VIDEO) {
    //     const video = engine.video(FPS, WIDTH, HEIGHT, FRAMES * LOOPS, (ctx, props) => {
    //         const { index } = props;
    //         const t = mod(index / FRAMES);
    //         scene(ctx, t, LAYOUT);
    //     })
    //     ui.mountVideo(video);
    // }
});

const mic_buf = makeRingBuffer(BUFFER_SIZE);
const frequency_buffers = n_arr(FFT_SIZE / 2, () => makeRingBuffer(BUFFER_SIZE));

function scene(ctx: CanvasRenderingContext2D, t: number, frequency: Uint8Array, waveform: Uint8Array, layout: Layout) {
    frequency.forEach((value, i) => frequency_buffers[i].push(value));

    const mic_level = frequency.reduce((a, b) => a + b, 0) / frequency.length / 255;
    mic_buf.push(mic_level);

    const max_level = mic_buf.buffer.reduce((a, b) => Math.max(a, b), 0);
    const mic_f = mic_level / max_level;


    const gap = PAD;
    // drawMicF(ctx, layout, mic_f, 0, 0, 0.5 - gap / 2, 0.5 - gap / 2);
    drawMicBuf(ctx, layout, mic_buf, 0.5 + gap / 2, 0, 0.5 - gap / 2, 0.5 - gap / 2);
    drawWaveform(ctx, layout, waveform, 0, 0, 0.5 - gap / 2, 0.5 - gap / 2);
    drawFrequencyBars(ctx, layout, frequency, 0, 0.5 + gap / 2, 0.5 - gap / 2, 0.5 - gap / 2);
    drawSpectrogram(ctx, layout, frequency_buffers, 0.5 + gap / 2, 0.5 + gap / 2, 0.5 - gap / 2, 0.5 - gap / 2);
}

function drawBorder(ctx: CanvasRenderingContext2D, layout: Layout, x: number, y: number, w: number, h: number) {
    ctx.beginPath();
    ctx.rect(layout.getX(x), layout.getY(y), layout.getSize(w), layout.getSize(h));
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.stroke();
}

function drawMicF(ctx: CanvasRenderingContext2D, layout: Layout, mic_f: number, x: number, y: number, w: number, h: number) {
    drawBorder(ctx, layout, x, y, w, h);

    const radius = mic_f / 6;

    ctx.beginPath();
    ctx.arc(layout.getX(x + 0.5 * w), layout.getY(y + 0.5 * h), layout.getSize(radius), 0, 2 * Math.PI);
    ctx.fillStyle = "white"
    ctx.fill();
}

function drawMicBuf(ctx: CanvasRenderingContext2D, layout: Layout, mic_buf: RingBuffer, x: number, y: number, w: number, h: number) {
    drawBorder(ctx, layout, x, y, w, h);

    for (let i = 0; i < mic_buf.size; i++) {
        const level = mic_buf.get(i);

        const f = i / mic_buf.size;

        const bar_h = level * h;
        const bar_w = w / mic_buf.size;

        ctx.beginPath();
        ctx.rect(
            layout.getX(x + f * w), layout.getY(y + h * 0.5 - bar_h * h / 2),
            layout.getSize(bar_w) + 1, layout.getSize(bar_h * h)
        );

        ctx.fillStyle = "white";
        ctx.fill();
    };
}

function drawWaveform(ctx: CanvasRenderingContext2D, layout: Layout, waveform: Uint8Array, x: number, y: number, w: number, h: number) {
    drawBorder(ctx, layout, x, y, w, h);

    ctx.beginPath();
    for (let i = 0; i < waveform.length; i++) {
        const v = waveform[i] / 255;
        const f = i / (waveform.length - 1);
        const bar_h = v * h;

        if (i === 0)
            ctx.moveTo(layout.getX(x + f * w), layout.getY(y + h - bar_h));
        else
            ctx.lineTo(layout.getX(x + f * w), layout.getY(y + h - bar_h));
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.stroke();
}

function drawFrequencyBars(ctx: CanvasRenderingContext2D, layout: Layout, frequency: Uint8Array, x: number, y: number, w: number, h: number) {
    drawBorder(ctx, layout, x, y, w, h);

    frequency.forEach((value, i) => {
        const f = i / frequency.length;

        const bar_h = value / 255 * h;
        const bar_w = w / frequency.length;

        ctx.beginPath();
        ctx.rect(
            layout.getX(x + f * w), layout.getY(y + h - bar_h),
            layout.getSize(bar_w) + 1, layout.getSize(bar_h)
        );
        ctx.fillStyle = "white";
        ctx.fill();
    });
}

function drawSpectrogram(ctx: CanvasRenderingContext2D, layout: Layout, frequency_buffers: RingBuffer[], x: number, y: number, w: number, h: number) {
    drawBorder(ctx, layout, x, y, w, h);

    frequency_buffers.forEach((buf, i) => {
        const f = i / frequency_buffers.length;

        for (let j = 0; j < buf.size; j++) {
            const buf_f = j / buf.size;
            const value = buf.get(j) / 255;

            if (value === 0) continue;

            const bar_w = w / buf.size;
            const bar_h = h / frequency_buffers.length;

            // ctx.beginPath();
            // ctx.rect(
            //     layout.getX(x + buf_f * w), layout.getY(y + (1 - f) * h - bar_h),
            //     layout.getSize(bar_w) + 1, layout.getSize(bar_h)
            // );
            // ctx.fillStyle = `rgba(255, 255, 255, ${value})`;
            // ctx.fill();

            ctx.beginPath();
            ctx.moveTo(layout.getX(x + buf_f * w + bar_w / 2), layout.getY(y + (1 - f) * h));
            ctx.lineTo(layout.getX(x + buf_f * w + bar_w / 2), layout.getY(y + (1 - f) * h - bar_h));

            ctx.lineWidth = layout.getSize(bar_w);
            ctx.strokeStyle = getPlasmaColor(value);
            ctx.stroke();
        }
    });
}

function getPlasmaColor(value: number): string {
    value = clamp(value, 0, 1);

    // Plasma colormap with 6 color stops
    const colors = [
        { pos: 0.0, r: 13, g: 8, b: 135 },    // #0D0887 Deep Blue
        { pos: 0.2, r: 106, g: 0, b: 168 },   // #6A00A8 Purple
        { pos: 0.4, r: 177, g: 42, b: 144 },  // #B12A90 Magenta
        { pos: 0.6, r: 225, g: 100, b: 98 },  // #E16462 Red-Orange
        { pos: 0.8, r: 252, g: 166, b: 54 },  // #FCA636 Orange-Yellow
        { pos: 1.0, r: 240, g: 249, b: 33 }   // #F0F921 Bright Yellow
    ];

    // Find the two colors to interpolate between
    let i = 0;
    while (i < colors.length - 1 && value > colors[i + 1].pos) {
        i++;
    }

    const color1 = colors[i];
    const color2 = colors[i + 1];

    // Interpolate between the two colors
    const range = color2.pos - color1.pos;
    const t = range === 0 ? 0 : (value - color1.pos) / range;

    const r = Math.round(color1.r + (color2.r - color1.r) * t);
    const g = Math.round(color1.g + (color2.g - color1.g) * t);
    const b = Math.round(color1.b + (color2.b - color1.b) * t);

    return `rgb(${r}, ${g}, ${b}, ${value})`;
}
