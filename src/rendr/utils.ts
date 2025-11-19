export function n_arr<T>(n: number, callback: T | ((index: number, f: number, ff: number) => T)) {
   n = Math.max(0, Math.floor(n));
   return new Array(n).fill(null).map((_, i) => typeof callback === "function"
      ? (callback as (index: number, f: number, ff: number) => T)?.(i, i / n, i / (n - 1))
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

export const floorTo = (val: number, step: number) => {
   return Math.floor(val * step) / step;
}

export const map = (v: number, in_from: number, in_to: number, out_from: number, out_to: number) => {
   const f = (v - in_from) / (in_to - in_from);
   return out_from + f * (out_to - out_from);
}

export const lerp = (v: number, from: number, to: number) => {
   return map(v, 0, 1, from, to);
};

export const tri = (t: number) => {
   return 1 - Math.abs(1 - mod(t) * 2);
};

export const sin = (t: number) => {
   return Math.sin(t * Math.PI * 2);
};

export const sinn = (t: number) => {
   return map(sin(t), -1, 1, 0, 1);
};

export const inv_sinn = (t: number) => {
   return 1 - sinn(t);
};

export const cos = (t: number) => {
   return Math.cos(t * Math.PI * 2);
};

export const cosn = (t: number) => {
   return map(cos(t), -1, 1, 0, 1);
};

export const inv_cosn = (t: number) => {
   return 1 - cosn(t);
};

export const download_url = (url: string, name?: string) => {
   const a = document.createElement('a')
   a.href = url
   a.download = name ?? ''
   a.click()
}

export type LayoutType = "stretch" | "fit" | "fill"
export const getLayout = (type: LayoutType, width: number, height: number, padding = 0, x_range = 1, y_range = 1) => {
   const max_size = Math.max(width, height);
   const min_size = Math.min(width, height);

   switch (type) {
      case "stretch": {
         const size = min_size;
         return {
            size,
            min_size,
            max_size,
            screenX: (v: number) => map(v / x_range, 0, 1, padding, 1 - padding) * width,
            screenY: (v: number) => map(v / y_range, 0, 1, padding, 1 - padding) * height,
         }
      }
      case "fit": {
         const size = Math.min(width, height);
         return {
            size,
            min_size,
            max_size,
            screenX: (v: number) => map(v / x_range, 0, 1, padding, 1 - padding) * size - (size - width) / 2,
            screenY: (v: number) => map(v / y_range, 0, 1, padding, 1 - padding) * size - (size - height) / 2,
         }
      }
      case "fill": {
         const size = Math.max(width, height);
         return {
            size,
            min_size,
            max_size,
            screenX: (v: number) => map(v / x_range, 0, 1, padding, 1 - padding) * size - (size - width) / 2,
            screenY: (v: number) => map(v / y_range, 0, 1, padding, 1 - padding) * size - (size - height) / 2,
         }
      }
   }
}