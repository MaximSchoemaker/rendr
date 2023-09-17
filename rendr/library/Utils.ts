export function n_arr(n: number, callback: any) {
   n = Math.max(0, Math.floor(n));
   return new Array(n).fill(null).map((_, i) => typeof callback === "function"
      ? callback(i, i / n, i / (n - 1))
      : callback
   );
}

// const n_arr = (n, callback) => {
//    return new Array(n).fill(null).map((_, i) => callback(i));
// }

export const for_n = (n: number, callback: (i: number) => {}) => {
   for (let i = 0; i < n; i++)
      callback(i);
}

export const mod = (i: number, n = 1) => {
   return ((i % n) + n) % n;
}

export const clamp = (val: number, min = 0, max = 1) => {
   return Math.max(min, Math.min(max, val));
}

export const map = (v: number, in_from: number, in_to: number, out_from: number, out_to: number) => {
   const f = (v - in_from) / (in_to - in_from);
   return out_from + f * (out_to - out_from);
}

export const cos = (t: number) => {
   return Math.cos(t * Math.PI * 2);
}

export const cosn = (t: number) => {
   return map(cos(t), -1, 1, 0, 1);
}

export const invCosn = (t: number) => {
   return 1 - cosn(t);
}