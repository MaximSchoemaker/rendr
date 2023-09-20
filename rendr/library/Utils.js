export function n_arr(n, callback) {
    n = Math.max(0, Math.floor(n));
    return new Array(n).fill(null).map((_, i) => typeof callback === "function"
        ? callback(i, i / n, i / (n - 1))
        : callback);
}
// const n_arr = (n, callback) => {
//    return new Array(n).fill(null).map((_, i) => callback(i));
// }
export const for_n = (n, callback) => {
    for (let i = 0; i < n; i++)
        callback(i);
};
export const mod = (i, n = 1) => {
    return ((i % n) + n) % n;
};
export const clamp = (val, min = 0, max = 1) => {
    return Math.max(min, Math.min(max, val));
};
export const floorTo = (val, step) => {
    return Math.floor(val / step) * step;
};
export const map = (v, in_from, in_to, out_from, out_to) => {
    const f = (v - in_from) / (in_to - in_from);
    return out_from + f * (out_to - out_from);
};
export const cos = (t) => {
    return Math.cos(t * Math.PI * 2);
};
export const cosn = (t) => {
    return map(cos(t), -1, 1, 0, 1);
};
export const invCosn = (t) => {
    return 1 - cosn(t);
};
