
import { createAnimationFrameParameter, createCanvas, createSketch } from "../../rendr/rendr";
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
const BUFFER_SIZE = 128;


type Props = {
    REALTIME?: boolean;
    ANIMATION?: boolean;
    VIDEO?: boolean;
}

type RingBuffer = ReturnType<typeof makeRingBuffer>;

type Channel = "mono" | "left" | "right";
type DataType = "byte" | "float";

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

            // analyser.minDecibels = -90;
            // analyser.maxDecibels = -10;
            const minDecibels = analyser.minDecibels;
            const maxDecibels = analyser.maxDecibels;
            const decibelRange = maxDecibels - minDecibels;
            console.log("Analyser decibel range:", minDecibels, "to", maxDecibels, "range", decibelRange);
            analyser.smoothingTimeConstant = 0;
            // console.log(analyser.minDecibels, analyser.maxDecibels);

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const splitter = audioContext.createChannelSplitter(2);
            const analyserL = audioContext.createAnalyser();
            const analyserR = audioContext.createAnalyser();

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
                        return Array.from(byteWave).map(v => (v) / 255);
                    case "float":
                        const floatWave = getFloatWaveform(channel);
                        // Float waveform data is typically in the range [-1, 1], so we can normalize it to [0, 1]
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

            const frequency = getFrequency("left", "float");
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

function scene(ctx: CanvasRenderingContext2D, t: number, waveform: number[], waveform_left: number[], waveform_right: number[], frequency: number[], layout: Layout) {
    frequency.forEach((value, i) => frequency_buffers[i].push(value));

    const mic_level = frequency.reduce((a, b) => a + b, 0) / frequency.length;
    mic_buf.push(mic_level);

    const max_level = mic_buf.buffer.reduce((a, b) => Math.max(a, b), 0);
    const mic_f = mic_level / max_level;

    const gap = PAD;

    const cols = 2;
    const rows = 3;

    layoutGrid(0, 0, 1, 1, rows, cols, gap, [
        (x, y, w, h) => layoutCol(x, y, w, h, gap, [
            (x, y, w, h) => drawWaveform(ctx, layout, waveform_left, x, y, w, h),
            (x, y, w, h) => drawWaveform(ctx, layout, waveform_right, x, y, w, h),
            // (x, y, w, h) => drawWaveformPixel(ctx, layout, waveform, x, y, w, h),
        ]),

        (x, y, w, h) => layoutRow(x, y, w, h, gap, [
            // (x, y, w, h) => drawOscilloscope(ctx, layout, waveform_left, waveform_right, x, y, w, h),
            (x, y, w, h) => drawOscilloscopePixel(ctx, layout, waveform_left, waveform_right, x, y, w, h),
        ]),

        (x, y, w, h) => drawMicF(ctx, layout, mic_f, x, y, w, h),

        (x, y, w, h) => layoutRow(x, y, w, h, gap, [
            // (x, y, w, h) => drawMicBuf(ctx, layout, mic_buf, x, y, w, h),
            (x, y, w, h) => drawMicBufPixel(ctx, layout, mic_buf, x, y, w, h),
        ]),

        (x, y, w, h) => layoutRow(x, y, w, h, gap, [
            // (x, y, w, h) => drawFrequencyBars(ctx, layout, frequency, x, y, w, h),
            (x, y, w, h) => drawFrequencyBarsPixel(ctx, layout, frequency, x, y, w, h),
        ]),

        (x, y, w, h) => layoutRow(x, y, w, h, gap, [
            // (x, y, w, h) => drawSpectrogram(ctx, layout, frequency_buffers, x, y, w, h),
            (x, y, w, h) => drawSpectrogramPixel(ctx, layout, frequency_buffers, x, y, w, h),
        ]),
    ])
}

function layoutGrid(x: number, y: number, w: number, h: number, rows: number, cols: number, gap: number, items: ((x: number, y: number, width: number, height: number) => void)[]) {
    const cell_w = (w - gap * (cols - 1)) / cols;
    const cell_h = (h - gap * (rows - 1)) / rows;
    items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cell_x = x + col * (cell_w + gap);
        const cell_y = y + row * (cell_h + gap);
        item(cell_x, cell_y, cell_w, cell_h);
    });
}

function layoutRow(x: number, y: number, w: number, h: number, gap: number, items: ((x: number, y: number, width: number, height: number) => void)[]) {
    const cols = items.length;
    const rows = 1;
    layoutGrid(x, y, w, h, rows, cols, gap, items);
}

function layoutCol(x: number, y: number, w: number, h: number, gap: number, items: ((x: number, y: number, width: number, height: number) => void)[]) {
    const cols = 1;
    const rows = items.length;
    layoutGrid(x, y, w, h, rows, cols, gap, items);
}

function drawBorder(ctx: CanvasRenderingContext2D, layout: Layout, x: number, y: number, w: number, h: number) {
    ctx.beginPath();
    ctx.rect(layout.getX(x), layout.getY(y), layout.getSize(w), layout.getSize(h));
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.stroke();
}

function drawMicF(ctx: CanvasRenderingContext2D, layout: Layout, mic_f: number, x: number, y: number, w: number, h: number) {
    drawBorder(ctx, layout, x, y, w, h);

    const radius = mic_f / 2;
    const s = Math.min(w, h);

    ctx.beginPath();
    ctx.arc(layout.getX(x + 0.5 * w), layout.getY(y + 0.5 * h), layout.getSize(radius * s), 0, 2 * Math.PI);
    ctx.fillStyle = "white"
    ctx.fill();
}

function drawMicBuf(ctx: CanvasRenderingContext2D, layout: Layout, mic_buf: RingBuffer, x: number, y: number, w: number, h: number) {
    for (let i = 0; i < mic_buf.size; i++) {
        const level = mic_buf.get(i);

        const f = i / mic_buf.size;

        const bar_h = level;
        const bar_w = w / mic_buf.size;

        ctx.beginPath();
        ctx.rect(
            layout.getX(x + f * w), layout.getY(y + h * 0.5 - bar_h * h / 2),
            layout.getSize(bar_w) + 1, layout.getSize(bar_h * h)
        );

        ctx.fillStyle = "white";
        ctx.fill();
    };

    drawBorder(ctx, layout, x, y, w, h);
}

const mic_buf_canvas = createCanvas(BUFFER_SIZE, 128);
function drawMicBufPixel(ctx: CanvasRenderingContext2D, layout: Layout, mic_buf: RingBuffer, x: number, y: number, w: number, h: number) {
    const mic_buf_ctx = mic_buf_canvas.getContext("2d");
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
    ctx.drawImage(mic_buf_canvas, layout.getX(x), layout.getY(y), layout.getSize(w), layout.getSize(h));

    drawBorder(ctx, layout, x, y, w, h);
}

function drawWaveform(ctx: CanvasRenderingContext2D, layout: Layout, waveform: number[], x: number, y: number, w: number, h: number) {
    ctx.beginPath();
    for (let i = 0; i < waveform.length; i++) {
        const v = waveform[i];
        const f = i / (waveform.length - 1);
        const bar_h = v * h;

        if (i === 0)
            ctx.moveTo(layout.getX(x + f * w), layout.getY(y + h - bar_h));
        else
            ctx.lineTo(layout.getX(x + f * w), layout.getY(y + h - bar_h));
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.stroke();

    drawBorder(ctx, layout, x, y, w, h);
}

const waveform_canvas = createCanvas(FFT_SIZE, 128);
function drawWaveformPixel(ctx: CanvasRenderingContext2D, layout: Layout, waveform: number[], x: number, y: number, w: number, h: number) {
    const waveform_ctx = waveform_canvas.getContext("2d");
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
    ctx.drawImage(waveform_canvas, layout.getX(x), layout.getY(y), layout.getSize(w), layout.getSize(h));

    drawBorder(ctx, layout, x, y, w, h);
}

function drawFrequencyBars(ctx: CanvasRenderingContext2D, layout: Layout, frequency: number[], x: number, y: number, w: number, h: number) {
    frequency.forEach((value, i) => {
        const f = i / frequency.length;

        const bar_h = value * h;
        const bar_w = w / frequency.length;

        ctx.beginPath();
        ctx.rect(
            layout.getX(x + f * w), layout.getY(y + h - bar_h),
            layout.getSize(bar_w) + 1, layout.getSize(bar_h)
        );
        ctx.fillStyle = "white";
        ctx.fill();
    });

    drawBorder(ctx, layout, x, y, w, h);
}

const frequency_bars_canvas = createCanvas(FFT_SIZE / 2, 128);
function drawFrequencyBarsPixel(ctx: CanvasRenderingContext2D, layout: Layout, frequency: number[], x: number, y: number, w: number, h: number) {
    const frequency_bars_ctx = frequency_bars_canvas.getContext("2d");
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
    ctx.drawImage(frequency_bars_canvas, layout.getX(x), layout.getY(y), layout.getSize(w), layout.getSize(h));

    drawBorder(ctx, layout, x, y, w, h);
}


function drawSpectrogram(ctx: CanvasRenderingContext2D, layout: Layout, frequency_buffers: RingBuffer[], x: number, y: number, w: number, h: number) {
    frequency_buffers.forEach((buf, i) => {
        const f = i / frequency_buffers.length;

        for (let j = 0; j < buf.size; j++) {
            const buf_f = j / buf.size;
            const value = buf.get(j);

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

    drawBorder(ctx, layout, x, y, w, h);
}

const spectrogram_canvas = createCanvas(BUFFER_SIZE, FFT_SIZE / 2);
function drawSpectrogramPixel(ctx: CanvasRenderingContext2D, layout: Layout, frequency_buffers: RingBuffer[], x: number, y: number, w: number, h: number) {
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
    ctx.drawImage(spectrogram_canvas, layout.getX(x), layout.getY(y), layout.getSize(w), layout.getSize(h));

    drawBorder(ctx, layout, x, y, w, h);
}

function drawOscilloscope(ctx: CanvasRenderingContext2D, layout: Layout, waveform_left: number[], waveform_right: number[], x: number, y: number, w: number, h: number) {
    ctx.beginPath();
    for (let i = 0; i < waveform_left.length; i++) {
        const vL = waveform_left[i];
        const vR = waveform_right[i];
        const f = i / (waveform_left.length - 1);

        const x_pos = x + vL * w;
        const y_pos = y + vR * h;
        if (i === 0)
            ctx.moveTo(layout.getX(x_pos), layout.getY(y_pos));
        else
            ctx.lineTo(layout.getX(x_pos), layout.getY(y_pos));
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    ctx.stroke();

    drawBorder(ctx, layout, x, y, w, h);
}

const oscilloscope_canvas = createCanvas(FFT_SIZE / 2, FFT_SIZE / 2);
function drawOscilloscopePixel(ctx: CanvasRenderingContext2D, layout: Layout, waveform_left: number[], waveform_right: number[], x: number, y: number, w: number, h: number) {
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

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(oscilloscope_canvas, layout.getX(x), layout.getY(y), layout.getSize(w), layout.getSize(h));

    drawBorder(ctx, layout, x, y, w, h);
}

function getPlasmaColorRGB(value: number): { r: number; g: number; b: number } {
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

    return { r, g, b };
}

function getPlasmaColor(value: number): string {
    const color = getPlasmaColorRGB(value);
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
}
