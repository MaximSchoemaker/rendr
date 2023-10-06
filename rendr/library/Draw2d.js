export function mergeConfigs(config1, config2) {
    if (config1 === undefined)
        return config2 ?? {};
    return Array.isArray(config2)
        ? Array.isArray(config1)
            ? config2
            : config2.map(c => ({ ...config1, ...c }))
        : Array.isArray(config1)
            ? config1.map(c => ({ ...c, ...config2 }))
            : { ...config1, ...config2 };
}
class Draw2dContextBase {
    canvas;
    _config;
    constructor(canvas) {
        this.canvas = canvas;
    }
    clear(color) {
        Draw2d.clear(this.canvas, color);
    }
    config(config) {
        this._config = config;
    }
    beginPath() {
        Draw2d.beginPath(this.canvas);
    }
    closePath() {
        Draw2d.closePath(this.canvas);
    }
    stroke() {
        Draw2d.stroke(this.canvas);
    }
    fill() {
        Draw2d.fill(this.canvas);
    }
    beginDraw(config) {
        const merged_config = mergeConfigs(this._config, config);
        Draw2d.beginDraw(this.canvas, merged_config);
    }
    endDraw(config) {
        const merged_config = mergeConfigs(this._config, config);
        Draw2d.endDraw(this.canvas, merged_config);
    }
}
export class Draw2dContext extends Draw2dContextBase {
    moveTo(x1, y1, config) {
        const merged_config = mergeConfigs(this._config, config);
        Draw2d.moveTo(this.canvas, x1, y1, merged_config);
    }
    lineTo(x1, y1, config) {
        const merged_config = mergeConfigs(this._config, config);
        Draw2d.lineTo(this.canvas, x1, y1, merged_config);
    }
    line(x1, y1, x2, y2, config) {
        const merged_config = mergeConfigs(this._config, config);
        Draw2d.line(this.canvas, x1, y1, x2, y2, merged_config);
    }
    circle(x, y, r, config) {
        const merged_config = mergeConfigs(this._config, config);
        Draw2d.arc(this.canvas, x, y, r, 0, Math.PI * 2, false, merged_config);
    }
}
export class Draw2dVectorContext extends Draw2dContextBase {
    moveTo(p, config) {
        Draw2d.moveTo(this.canvas, p.x, p.y, config);
    }
    lineTo(p, config) {
        Draw2d.lineTo(this.canvas, p.x, p.y, config);
    }
    line(p1, p2, config) {
        Draw2d.line(this.canvas, p1.x, p1.y, p2.x, p2.y, config);
    }
}
export default class Draw2d {
    static beginDraw(canvas, config) {
        const ctx = canvas.getContext("2d");
        if (ctx === null || config === undefined)
            return;
        const beginDraw_config = (Array.isArray(config) ? config[0] : config);
        if (beginDraw_config.beginPath)
            ctx.beginPath();
    }
    static endDraw(canvas, config) {
        const ctx = canvas.getContext("2d");
        if (ctx === null || config === undefined)
            return;
        ctx.save();
        const endDraw_config = Array.isArray(config) ? config : [config];
        endDraw_config.forEach(config => {
            Object.entries(config)
                .forEach(([key, val]) => {
                if (ctx[key] != undefined && typeof ctx[key] !== 'function')
                    ctx[key] = val;
            });
            if (config.closePath)
                ctx.closePath();
            if (config.fill)
                ctx.fill();
            if (config.stroke)
                ctx.stroke();
        });
        ctx.restore();
    }
    static beginPath(canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx === null)
            return;
        ctx.beginPath();
    }
    static closePath(canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx === null)
            return;
        ctx.closePath();
    }
    static stroke(canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx === null)
            return;
        ctx.stroke();
    }
    static fill(canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx === null)
            return;
        ctx.fill();
    }
    static clear(canvas, color) {
        const { width, height } = canvas;
        const ctx = canvas.getContext("2d");
        if (ctx === null)
            return;
        ctx.save();
        ctx.resetTransform();
        ctx.globalCompositeOperation = "copy";
        ctx.fillStyle = color ?? "transparent";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
    static moveTo(canvas, x, y, config) {
        config && this.beginDraw(canvas, config);
        const ctx = canvas.getContext("2d");
        if (ctx === null)
            return;
        ctx.moveTo(x, y);
        config && this.endDraw(canvas, config);
    }
    static lineTo(canvas, x, y, config) {
        config && this.beginDraw(canvas, config);
        const ctx = canvas.getContext("2d");
        if (ctx === null)
            return;
        ctx.lineTo(x, y);
        config && this.endDraw(canvas, config);
    }
    static line(canvas, x1, y1, x2, y2, config) {
        config && this.beginDraw(canvas, config);
        const ctx = canvas.getContext("2d");
        if (ctx === null)
            return;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        config && this.endDraw(canvas, config);
    }
    static arc(canvas, x, y, r, a1, a2, flipped, config) {
        config && this.beginDraw(canvas, config);
        const ctx = canvas.getContext("2d");
        if (ctx === null)
            return;
        ctx.arc(x, y, r, a1, a2, flipped);
        config && this.endDraw(canvas, config);
    }
}
