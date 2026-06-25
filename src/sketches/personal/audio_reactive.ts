
import { l } from "vite/dist/node/types.d-jgA8ss1A";
import { createAnimationFrameParameter, createCanvas, createSketch } from "../../rendr/rendr";
import { angle_diff, clamp, cos, cosn, createColor, createHSL, getLayout, inv_cosn, LayoutType, lerp, lerpColor, map, mod, n_arr, sin, sinn, tri } from "../../rendr/utils";

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

const PAD = 10;
const LAYOUT = makeLayout("stretch", PAD, PAD, WIDTH - PAD, HEIGHT - PAD);

// ... video ...
const LOOPS = 1;

const FFT_SIZE = 2 ** 10;
const BUFFER_SIZE = 256;
const BYTE_SIZE = 256;
const SMOOTHING_TIME_CONSTANT = 0;

type Props = {
    REALTIME?: boolean;
    ANIMATION?: boolean;
    VIDEO?: boolean;
}

type RingBuffer = ReturnType<typeof makeRingBuffer>;

type Channel = "mono" | "left" | "right";
type DataType = "byte" | "float";

type Layout = ReturnType<typeof makeLayout>;

function makeLayout(type: LayoutType, start_x: number, start_y: number, end_x: number, end_y: number) {
    const width = end_x - start_x;
    const height = end_y - start_y;

    switch (type) {
        case "stretch":
            const size = Math.min(width, height);
            return {
                getX: (x: number) => lerp(x, start_x, end_x),
                getY: (y: number) => lerp(y, start_y, end_y),
                getWidth: (w: number) => lerp(w, 0, width),
                getHeight: (w: number) => lerp(w, 0, height),
                getSize: (s: number) => lerp(s, 0, size),
                start_x,
                start_y,
                end_x,
                end_y,
            }
        case "fit": {
            const size = Math.min(width, height);
            const offset_x = (width - size) / 2;
            const offset_y = (height - size) / 2;
            return {
                getX: (x: number) => lerp(x, start_x, start_x + size) + offset_x,
                getY: (y: number) => lerp(y, start_y, start_y + size) + offset_y,
                getWidth: (w: number) => lerp(w, 0, size),
                getHeight: (w: number) => lerp(w, 0, size),
                getSize: (s: number) => lerp(s, 0, size),
                start_x,
                start_y,
                end_x,
                end_y,
            }
        }
        case "fill": {
            const size = Math.max(width, height);
            const offset_x = (width - size) / 2;
            const offset_y = (height - size) / 2;
            return {
                getX: (x: number) => lerp(x, start_x, start_x + size) + offset_x,
                getY: (y: number) => lerp(y, start_y, start_y + size) + offset_y,
                getWidth: (w: number) => lerp(w, 0, size),
                getHeight: (w: number) => lerp(w, 0, size),
                getSize: (s: number) => lerp(s, 0, size),
                start_x,
                start_y,
                end_x,
                end_y,
            }
        }
        default:
            throw new Error(`Unknown layout type: ${type}`);
    }
}

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

    const waveformByteArray = new Uint8Array(FFT_SIZE);
    const waveformFloatArray = new Float32Array(FFT_SIZE);
    const waveformArray = new Array(FFT_SIZE).fill(0);

    let getByteWaveform = (channel: Channel) => waveformByteArray;
    let getFloatWaveform = (channel: Channel) => waveformFloatArray;
    let getWaveform = (channel: Channel, type: DataType) => waveformArray;

    const frequencyByteArray = new Uint8Array(FFT_SIZE / 2);
    const frequencyFloatArray = new Float32Array(FFT_SIZE / 2);
    const frequencyArray = new Array(FFT_SIZE / 2).fill(0);

    let getByteFrequency = (channel: Channel) => frequencyByteArray;
    let getFloatFrequency = (channel: Channel) => frequencyFloatArray;
    let getFrequency = (channel: Channel, type: DataType) => frequencyArray;

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
            analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

            const analyserL = audioContext.createAnalyser();
            analyserL.fftSize = FFT_SIZE;
            analyserL.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT

            const analyserR = audioContext.createAnalyser();
            analyserR.fftSize = FFT_SIZE;
            analyserR.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT

            console.log("Analyser FFT size:", analyser.fftSize);
            console.log("Analyser smoothing time constant:", analyser.smoothingTimeConstant);

            const minDecibels = analyser.minDecibels;
            const maxDecibels = analyser.maxDecibels;
            const decibelRange = maxDecibels - minDecibels;
            console.log("Analyser decibel range:", minDecibels, "to", maxDecibels, "range", decibelRange);

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const splitter = audioContext.createChannelSplitter(2);
            source.connect(splitter);
            splitter.connect(analyserL, 0); // left channel
            splitter.connect(analyserR, 1); // right channel

            getByteWaveform = (channel: Channel) => {
                switch (channel) {
                    case "mono":
                        analyser.getByteTimeDomainData(waveformByteArray);
                        return waveformByteArray;
                    case "left":
                        analyserL.getByteTimeDomainData(waveformByteArray);
                        return waveformByteArray;
                    case "right":
                        analyserR.getByteTimeDomainData(waveformByteArray);
                        return waveformByteArray;
                    default:
                        throw new Error(`Unknown channel: ${channel}`);
                }
            }
            getFloatWaveform = (channel: Channel) => {
                switch (channel) {
                    case "mono":
                        analyser.getFloatTimeDomainData(waveformFloatArray);
                        return waveformFloatArray;
                    case "left":
                        analyserL.getFloatTimeDomainData(waveformFloatArray);
                        return waveformFloatArray;
                    case "right":
                        analyserR.getFloatTimeDomainData(waveformFloatArray);
                        return waveformFloatArray;
                    default:
                        throw new Error(`Unknown channel: ${channel}`);
                }
            }

            getWaveform = (channel: Channel, type: DataType) => {
                switch (type) {
                    case "byte":
                        const byteWave = getByteWaveform(channel);
                        return Array.from(byteWave).map(v => v / 255);
                    case "float":
                        const floatWave = getFloatWaveform(channel);
                        return Array.from(floatWave).map(v => (v + 1) / 2);
                    default:
                        throw new Error(`Unknown waveform type: ${type}`);
                }
            }

            getByteFrequency = (channel: Channel) => {
                switch (channel) {
                    case "mono":
                        analyser.getByteFrequencyData(frequencyByteArray);
                        return frequencyByteArray;
                    case "left":
                        analyserL.getByteFrequencyData(frequencyByteArray);
                        return frequencyByteArray;
                    case "right":
                        analyserR.getByteFrequencyData(frequencyByteArray);
                        return frequencyByteArray;
                    default:
                        throw new Error(`Unknown channel: ${channel}`);
                }
            };

            getFloatFrequency = (channel: Channel) => {
                switch (channel) {
                    case "mono":
                        analyser.getFloatFrequencyData(frequencyFloatArray);
                        return frequencyFloatArray;
                    case "left":
                        analyserL.getFloatFrequencyData(frequencyFloatArray);
                        return frequencyFloatArray;
                    case "right":
                        analyserR.getFloatFrequencyData(frequencyFloatArray);
                        return frequencyFloatArray;
                    default:
                        throw new Error(`Unknown channel: ${channel}`);
                }
            };

            getFrequency = (channel: Channel, type: DataType) => {
                switch (type) {
                    case "byte":
                        const byteFreq = getByteFrequency(channel);
                        return Array.from(byteFreq).map(v => v / 255);
                    case "float":
                        const floatFreq = getFloatFrequency(channel);
                        // Normalize to [0, 1]
                        return Array.from(floatFreq).map(v => clamp(map(v, minDecibels, maxDecibels, 0, 1), 0, 1));
                    default:
                        throw new Error(`Unknown frequency type: ${type}`);
                }
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

            const waveform = getWaveform("mono", "float");
            const waveform_left = getWaveform("left", "float");
            const waveform_right = getWaveform("right", "float");

            const frequency = getFrequency("mono", "float");
            scene(ctx, t, waveform, waveform_left, waveform_right, frequency, LAYOUT);
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
const impact_buffers = n_arr(FFT_SIZE / 2, () => makeRingBuffer(BUFFER_SIZE));
const impact_threshold_buffers = n_arr(FFT_SIZE / 2, () => makeRingBuffer(BUFFER_SIZE));
const BIN_COUNT = 32;
const beat_buffers = n_arr(BIN_COUNT, () => makeRingBuffer(BUFFER_SIZE));
const measure_buffer = makeRingBuffer(BUFFER_SIZE);
const sig_buffer = makeRingBuffer(32);
function scene(ctx: CanvasRenderingContext2D, t: number, waveform: number[], waveform_left: number[], waveform_right: number[], frequency: number[], layout: Layout) {
    frequency.forEach((value, i) => frequency_buffers[i].push(value));

    const mic_level = frequency.reduce((a, b) => a + b, 0) / frequency.length;
    mic_buf.push(mic_level);

    frequency.forEach((value, i) => impact_buffers[i].push(value > mic_level ? value : 0));

    const quiet_count = 50;
    impact_buffers.forEach((buf, i) => {
        if (buf.get(-1) === 0) {
            impact_threshold_buffers[i].push(0)
            return
        }
        for (let j = 0; j < quiet_count; j++)
            if (buf.get(-2 - j) > buf.get(-1)) {
                impact_threshold_buffers[i].push(0)
                return;
            }
        impact_threshold_buffers[i].push(1)
    });

    for (let i = 0; i < BIN_COUNT; i++) {
        const size = Math.floor(1 * frequency.length / BIN_COUNT);
        const impact_threshold_bin = impact_threshold_buffers.slice(i * size, (i + 1) * size);
        const onsetStrength = impact_threshold_bin.reduce((sum, buf) => sum + buf.get(-1), 0) / impact_threshold_bin.length;
        beat_buffers[i].push(onsetStrength > 0.0 ? 1 : 0);
    }


    const avg_beat = beat_buffers.reduce((sum, buf) =>
        sum +
        buf.buffer.reduce((sum, value) => sum + value) / buf.size
        , 0) / BIN_COUNT


    measure_buffer.push(
        beat_buffers.reduce((sum, buf) => sum + buf.get(-1), 0) / BIN_COUNT > avg_beat * 4
            && measure_buffer.get(-1) === 0
            && measure_buffer.get(-2) === 0
            && measure_buffer.get(-3) === 0
            && measure_buffer.get(-4) === 0
            && measure_buffer.get(-5) === 0
            && measure_buffer.get(-6) === 0
            && measure_buffer.get(-7) === 0
            && measure_buffer.get(-8) === 0
            && measure_buffer.get(-9) === 0
            && measure_buffer.get(-10) === 0
            ? 1 : 0
    );

    const last_measures = [];
    for (let i = 0; i < measure_buffer.size; i++) {
        if (measure_buffer.get(-1 - i) === 1) last_measures.push(i);
    }

    let sig = 1;
    if (last_measures.length >= 2) {
        const interval = last_measures[0] - last_measures[1];
        const frames_since_last_measure = last_measures[0];
        const measure_progress = -frames_since_last_measure / interval;
        sig = (1 - tri(Math.min(measure_progress, 2)));
    }
    sig_buffer.push(sig);

    // const max_level = mic_buf.buffer.reduce((a, b) => Math.max(a, b), 0);
    // const mic_f = mic_level / max_level;

    const gap = 10;

    const cols = 2;
    const rows = 4;

    // drawBorder(ctx, layout);
    layoutGrid(layout, "stretch", rows, cols, gap, [

        (layout) => layoutCol(layout, "stretch", gap, [
            // (layout) => drawWaveformPixel(ctx, layout, waveform_left),
            // (layout) => drawWaveformPixel(ctx, layout, waveform_right),
            (layout) => drawWaveform(ctx, layout, waveform_left),
            (layout) => drawWaveform(ctx, layout, waveform_right),
        ]),

        (layout) => layoutRow(layout, "fit", gap, [
            (layout) => drawOscilloscopePixel(ctx, layout, waveform_left, waveform_right),
            (layout) => drawOscilloscope(ctx, layout, waveform_left, waveform_right),
        ]),

        (layout) => layoutRow(layout, "stretch", gap, [
            (layout) => drawFrequencyLine(ctx, layout, frequency),
            // (layout) => drawFrequencyBars(ctx, layout, frequency),
            (layout) => drawFrequencyBarsPixel(ctx, layout, frequency),
        ]),

        (layout) => layoutRow(layout, "stretch", gap, [
            // (layout) => drawSpectrogram(ctx, layout, frequency_buffers),
            (layout) => drawSpectrogramPixel(ctx, layout, frequency_buffers),
        ]),
        (layout) => layoutRow(layout, "fit", gap, [
            (layout) => drawMicLevel(ctx, layout, mic_level),
        ]),

        (layout) => layoutRow(layout, "stretch", gap, [
            // (layout) => drawMicBuf(ctx, layout, mic_buf),
            (layout) => drawMicBufPixel(ctx, layout, mic_buf),
        ]),

        (layout) => layoutCol(layout, "stretch", gap, [
            // (layout) => layoutRow(layout, "stretch", gap, [
            //     (layout) => drawSpectrogramPixel(ctx, layout, impact_buffers),
            //     (layout) => drawSpectrogramPixel(ctx, layout, impact_threshold_buffers),
            // ]),
            (layout) => drawSpectrogram(ctx, layout, beat_buffers),
            (layout) => drawMicBufPixel(ctx, layout, measure_buffer),
        ]),

        (layout) => layoutCol(layout, "stretch", gap, [
            (layout) => layoutRow(layout, "stretch", gap, [
                (layout) => drawMicLevel(ctx, layout, measure_buffer.get(-1)),
                (layout) => drawMicLevel(ctx, layout, sig),
            ]),
            (layout) => layoutRow(layout, "stretch", gap, [
                (layout) => drawSig(ctx, layout, sig),
            ]),
            (layout) => drawMicBufPixel(ctx, layout, sig_buffer),
        ]),

        // (layout) => layoutRow(layout, "stretch", gap,
        //     onset_strengths.map(strength => (layout) => layoutCol(layout, "stretch", gap, [
        //         (layout) => drawMicLevel(ctx, layout, strength),
        //         (layout) => drawMicLevel(ctx, layout, strength > 0.02 ? 1 : 0),
        //     ])
        //     )
        // ),
    ])
}

function layoutGrid(layout: Layout, layoutType: LayoutType, rows: number, cols: number, gap: number, items: ((layout: Layout) => void)[]) {
    const x = layout.getX(0);
    const y = layout.getY(0);
    const w = layout.getWidth(1);
    const h = layout.getHeight(1);

    const cell_w = (w - gap * (cols - 1)) / cols;
    const cell_h = (h - gap * (rows - 1)) / rows;
    items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cell_x = x + col * (cell_w + gap);
        const cell_y = y + row * (cell_h + gap);
        const grid_layout = makeLayout(layoutType, cell_x, cell_y, cell_x + cell_w, cell_y + cell_h);
        item(grid_layout);
    });
}

function layoutRow(layout: Layout, layoutType: LayoutType, gap: number, items: ((layout: Layout) => void)[]) {
    const cols = items.length;
    const rows = 1;
    layoutGrid(layout, layoutType, rows, cols, gap, items);
}

function layoutCol(layout: Layout, layoutType: LayoutType, gap: number, items: ((layout: Layout) => void)[]) {
    const cols = 1;
    const rows = items.length;
    layoutGrid(layout, layoutType, rows, cols, gap, items);
}

function drawBorder(ctx: CanvasRenderingContext2D, layout: Layout) {
    const x = layout.start_x;
    const y = layout.start_y;
    const w = layout.end_x - layout.start_x;
    const h = layout.end_y - layout.start_y;

    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.stroke();
}

function drawMicLevel(ctx: CanvasRenderingContext2D, layout: Layout, mic_level: number) {
    // ctx.fillStyle = "white";
    // ctx.fillRect(layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    const radius = mic_level / 2;

    ctx.beginPath();
    ctx.arc(layout.getX(0.5), layout.getY(0.5), layout.getSize(radius), 0, 2 * Math.PI);
    ctx.fillStyle = "white"
    ctx.fill();

    drawBorder(ctx, layout);
}

function drawSig(ctx: CanvasRenderingContext2D, layout: Layout, sig: number) {

    // ctx.fillStyle = "white";
    // ctx.fillRect(layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    const radius = 0.5;
    const rat = layout.getWidth(1) / layout.getHeight(1);
    const x = lerp(1 - cosn(Math.pow(sig, 3) * 0.5), radius / rat, 1 - radius / rat);
    ctx.beginPath();
    ctx.arc(layout.getX(x), layout.getY(0.5), layout.getSize(radius), 0, 2 * Math.PI);
    ctx.fillStyle = "white"
    ctx.fill();

    drawBorder(ctx, layout);
}

function drawMicBuf(ctx: CanvasRenderingContext2D, layout: Layout, mic_buf: RingBuffer) {
    // ctx.fillStyle = "white";
    // ctx.fillRect(layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    for (let i = 0; i < mic_buf.size; i++) {
        const level = mic_buf.get(i);

        const f = i / mic_buf.size;

        const bar_h = level;
        const bar_w = 1 / mic_buf.size;

        ctx.beginPath();
        ctx.rect(
            layout.getX(f), layout.getY(0.5 - bar_h / 2),
            layout.getWidth(bar_w) + 1, layout.getHeight(bar_h)
        );

        ctx.fillStyle = "white";
        ctx.fill();
    };

    drawBorder(ctx, layout);
}

const mic_buf_canvas = createCanvas(BUFFER_SIZE, BYTE_SIZE);
function drawMicBufPixel(ctx: CanvasRenderingContext2D, layout: Layout, mic_buf: RingBuffer) {
    const mic_buf_ctx = mic_buf_canvas.getContext("2d", { willReadFrequently: true });
    if (!mic_buf_ctx) return;

    const width = mic_buf_canvas.width;
    const height = mic_buf_canvas.height;
    const imageData = mic_buf_ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Clear the pixel buffer
    for (let i = 0; i < data.length; i++) {
        data[i] = 0;
    }

    // Write pixels directly to buffer
    for (let i = 0; i < mic_buf.size; i++) {
        const level = mic_buf.get(i);
        const x_start = Math.floor(i / mic_buf.size * width);
        const x_width = Math.ceil(width / mic_buf.size);
        const y_center = height * 0.5;
        const y_height = height * level * 0.5;

        const y_start = Math.floor(y_center - y_height);
        const y_end = Math.ceil(y_center + y_height);

        for (let px = x_start; px < x_start + x_width && px < width; px++) {
            for (let py = y_start; py < y_end && py < height; py++) {
                if (py >= 0) {
                    const index = (py * width + px) * 4;
                    data[index] = 255;       // R
                    data[index + 1] = 255;   // G
                    data[index + 2] = 255;   // B
                    data[index + 3] = 255;   // A
                }
            }
        }
    }

    mic_buf_ctx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mic_buf_canvas, layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    drawBorder(ctx, layout);
}

function drawWaveform(ctx: CanvasRenderingContext2D, layout: Layout, waveform: number[]) {
    // ctx.fillStyle = "white";
    // ctx.fillRect(layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    ctx.beginPath();
    for (let i = 0; i < waveform.length; i++) {
        const v = waveform[i];
        const f = i / (waveform.length - 1);

        if (i === 0)
            ctx.moveTo(layout.getX(f), layout.getY(v));
        else
            ctx.lineTo(layout.getX(f), layout.getY(v));
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.stroke();

    drawBorder(ctx, layout);
}

const waveform_canvas = createCanvas(FFT_SIZE, BYTE_SIZE);
function drawWaveformPixel(ctx: CanvasRenderingContext2D, layout: Layout, waveform: number[]) {
    const waveform_ctx = waveform_canvas.getContext("2d", { willReadFrequently: true });
    if (!waveform_ctx) return;

    const width = waveform_canvas.width;
    const height = waveform_canvas.height;
    const imageData = waveform_ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Clear the pixel buffer
    for (let i = 0; i < data.length; i++) {
        data[i] = 0;
    }

    // Write pixels directly to buffer
    for (let i = 0; i < waveform.length; i++) {
        const v = waveform[i];
        const f = i / (waveform.length - 1);
        const x_pos = Math.floor(f * width);
        const y_pos = Math.floor((1 - v) * height);

        // Draw a vertical line at this x position for thickness
        const line_thickness = 1;
        for (let ly = Math.max(0, y_pos - line_thickness); ly < Math.min(height, y_pos + line_thickness); ly++) {
            const index = (ly * width + x_pos) * 4;
            data[index] = 255;       // R
            data[index + 1] = 255;   // G
            data[index + 2] = 255;   // B
            data[index + 3] = 255;   // A
        }
    }

    waveform_ctx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(waveform_canvas, layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    drawBorder(ctx, layout);
}

function drawFrequencyBars(ctx: CanvasRenderingContext2D, layout: Layout, frequency: number[]) {
    // ctx.fillStyle = "white";
    // ctx.fillRect(layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    frequency.forEach((value, i) => {
        const f = i / frequency.length;

        const bar_h = value;
        const bar_w = 1 / frequency.length;

        ctx.beginPath();
        ctx.rect(
            layout.getX(f), layout.getY(1 - bar_h),
            layout.getWidth(bar_w) + 1, layout.getHeight(bar_h)
        );
        ctx.fillStyle = "white";
        ctx.fill();
    });

    drawBorder(ctx, layout);
}

function drawFrequencyLine(ctx: CanvasRenderingContext2D, layout: Layout, frequency: number[]) {
    ctx.beginPath();
    frequency.forEach((value, i) => {
        const f = i / frequency.length;
        const bar_h = value;
        const x = layout.getX(f);
        const y = layout.getY(1 - bar_h);

        if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    });

    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.stroke();

    drawBorder(ctx, layout);
}

const frequency_bars_canvas = createCanvas(FFT_SIZE / 2, BYTE_SIZE);
function drawFrequencyBarsPixel(ctx: CanvasRenderingContext2D, layout: Layout, frequency: number[]) {
    const frequency_bars_ctx = frequency_bars_canvas.getContext("2d", { willReadFrequently: true });
    if (!frequency_bars_ctx) return;

    const width = frequency_bars_canvas.width;
    const height = frequency_bars_canvas.height;
    const imageData = frequency_bars_ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Clear the pixel buffer
    for (let i = 0; i < data.length; i++) {
        data[i] = 0;
    }

    // Write pixels directly to buffer
    frequency.forEach((value, i) => {
        const f = i / frequency.length;
        const bar_h = value;
        const x_start = Math.floor(f * width);
        const x_width = Math.ceil(width / frequency.length);
        const y_height = Math.floor(bar_h * height);
        const y_start = height - y_height;

        for (let px = x_start; px < x_start + x_width && px < width; px++) {
            for (let py = y_start; py < height; py++) {
                const index = (py * width + px) * 4;
                data[index] = 255;       // R
                data[index + 1] = 255;   // G
                data[index + 2] = 255;   // B
                data[index + 3] = 255;   // A
            }
        }
    });

    frequency_bars_ctx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frequency_bars_canvas, layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    drawBorder(ctx, layout);
}


function drawSpectrogram(ctx: CanvasRenderingContext2D, layout: Layout, frequency_buffers: RingBuffer[]) {
    // ctx.fillStyle = "white";
    // ctx.fillRect(layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    frequency_buffers.forEach((buf, i) => {
        const f = i / frequency_buffers.length;

        for (let j = 0; j < buf.size; j++) {
            const buf_f = j / buf.size;
            const value = buf.get(j);

            if (value === 0) continue;

            const bar_w = 1 / buf.size;
            const bar_h = 1 / frequency_buffers.length;

            ctx.beginPath();
            ctx.moveTo(layout.getX(buf_f + bar_w / 2), layout.getY((1 - f)));
            ctx.lineTo(layout.getX(buf_f + bar_w / 2), layout.getY((1 - f) - bar_h));

            ctx.lineWidth = layout.getSize(bar_w);
            ctx.strokeStyle = getPlasmaColor(value);
            ctx.stroke();
        }
    });

    drawBorder(ctx, layout);
}

const spectrogram_canvas = createCanvas(BUFFER_SIZE, FFT_SIZE / 2);
function drawSpectrogramPixel(ctx: CanvasRenderingContext2D, layout: Layout, frequency_buffers: RingBuffer[]) {
    const spectrogram_ctx = spectrogram_canvas.getContext("2d", { willReadFrequently: true });
    if (!spectrogram_ctx) return;

    const width = spectrogram_canvas.width;
    const height = spectrogram_canvas.height;
    const imageData = spectrogram_ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Clear the pixel buffer
    for (let i = 0; i < data.length; i++) {
        data[i] = 0;
    }

    // Write pixels directly to buffer (flipped vertically - high frequencies at top)
    frequency_buffers.forEach((buf, i) => {
        const y_pos = height - 1 - i;

        for (let j = 0; j < buf.size; j++) {
            const value = buf.get(j);

            if (value === 0) continue;

            const x_pos = Math.floor(j / buf.size * width);
            const x_width = Math.ceil(width / buf.size);

            const color = getPlasmaColorRGB(value);

            for (let px = x_pos; px < x_pos + x_width && px < width; px++) {
                if (y_pos >= 0 && y_pos < height) {
                    const index = (y_pos * width + px) * 4;
                    data[index] = color.r;       // R
                    data[index + 1] = color.g;   // G
                    data[index + 2] = color.b;   // B
                    data[index + 3] = 255;       // A
                }
            }
        }
    });

    spectrogram_ctx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(spectrogram_canvas, layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    drawBorder(ctx, layout);
}

function drawOscilloscope(ctx: CanvasRenderingContext2D, layout: Layout, waveform_left: number[], waveform_right: number[]) {
    // ctx.fillStyle = "white";
    // ctx.fillRect(layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    ctx.beginPath();
    for (let i = 0; i < waveform_left.length; i++) {
        const vL = waveform_left[i];
        const vR = waveform_right[i];
        const f = i / (waveform_left.length - 1);

        if (i === 0)
            ctx.moveTo(layout.getX(vL), layout.getY(vR));
        else
            ctx.lineTo(layout.getX(vL), layout.getY(vR));
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.stroke();

    drawBorder(ctx, layout);
}

const oscilloscope_canvas = createCanvas(BYTE_SIZE, BYTE_SIZE);
function drawOscilloscopePixel(ctx: CanvasRenderingContext2D, layout: Layout, waveform_left: number[], waveform_right: number[]) {
    const oscilloscope_ctx = oscilloscope_canvas.getContext("2d", { willReadFrequently: true });
    if (!oscilloscope_ctx) return;

    const width = oscilloscope_canvas.width;
    const height = oscilloscope_canvas.height;
    const imageData = oscilloscope_ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Clear the pixel buffer
    for (let i = 0; i < data.length; i++) {
        data[i] = 0;
    }

    // Write pixels directly to buffer
    for (let i = 0; i < waveform_left.length; i++) {
        const vL = waveform_left[i];
        const vR = waveform_right[i];

        const x_pos = Math.floor(vL * width);
        const y_pos = Math.floor(vR * height);

        // Draw a point at this position
        if (x_pos >= 0 && x_pos < width && y_pos >= 0 && y_pos < height) {
            const index = (y_pos * width + x_pos) * 4;
            data[index] = 255;       // R
            data[index + 1] = 255;   // G
            data[index + 2] = 255;   // B
            data[index + 3] = 255;   // A
        }
    }

    oscilloscope_ctx.putImageData(imageData, 0, 0);
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(oscilloscope_canvas,
        layout.getX(0), layout.getY(0),
        layout.getWidth(1), layout.getHeight(1)
    );

    drawBorder(ctx, layout);
}

function drawImpact(ctx: CanvasRenderingContext2D, layout: Layout, impact_buffers: RingBuffer[]) {
    // ctx.fillStyle = "white";
    // ctx.fillRect(layout.getX(0), layout.getY(0), layout.getWidth(1), layout.getHeight(1));

    impact_buffers.forEach((buf, i) => {
        const f = i / impact_buffers.length;

        for (let j = 0; j < buf.size; j++) {
            const buf_f = j / buf.size;
            const value = buf.get(j);

            if (value === 0) continue;

            const bar_w = 1 / buf.size;
            const bar_h = 1 / impact_buffers.length;

            ctx.beginPath();
            ctx.moveTo(layout.getX(buf_f + bar_w / 2), layout.getY((1 - f)));
            ctx.lineTo(layout.getX(buf_f + bar_w / 2), layout.getY((1 - f) - bar_h));

            ctx.lineWidth = layout.getSize(bar_w);
            ctx.strokeStyle = getPlasmaColor(value);
            ctx.stroke();
        }
    });

    drawBorder(ctx, layout);
}

function getPlasmaColorRGB(value: number): { r: number; g: number; b: number } {
    value = clamp(value, 0, 1);

    // Plasma colormap with 6 color stops
    const colors = [
        { pos: 0.0, r: 13, g: 8, b: 135 },    // #0D0887 Deep Blue
        { pos: 0.2, r: 106, g: 0, b: 168 },   // #6A00A8 Purple
        { pos: 0.4, r: 177, g: 42, b: 144 },  // #B12A90 Magenta
        { pos: 0.6, r: 225, g: 100, b: 98 },  // #E16462 white-Orange
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

    return { r, g, b };
}

function getPlasmaColor(value: number): string {
    const color = getPlasmaColorRGB(value);
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
}
