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

export const for_n = (n: number, callback: (i: number) => void) => {
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

export function map(v: number, in_from: number, in_to: number, out_from?: number, out_to?: number) {
   if (out_from === undefined && out_to === undefined) {
      out_from = in_from;
      out_to = in_to;
      in_from = 0;
      in_to = 1;
   }

   if (out_from === undefined || out_to === undefined || out_from === undefined || out_to === undefined)
      throw new Error(`wrong signature for map. Expected: (number, number, number, number, number). Got: (${[...arguments].join(", ")})`);

   const f = (v - in_from) / (in_to - in_from);
   return out_from + f * (out_to - out_from);
}

export const lerp = (v: number, from: number, to: number) => {
   return map(v, 0, 1, from, to);
};

export const tri = (v: number) => {
   return 1 - Math.abs(1 - mod(v) * 2);
};

export const sin = (v: number) => {
   return Math.sin(v * Math.PI * 2);
};

export const sinn = (v: number) => {
   return map(sin(v), -1, 1, 0, 1);
};

export const inv_sinn = (v: number) => {
   return 1 - sinn(v);
};

export const cos = (v: number) => {
   return Math.cos(v * Math.PI * 2);
};

export const cosn = (v: number) => {
   return map(cos(v), -1, 1, 0, 1);
};

export const inv_cosn = (v: number) => {
   return 1 - cosn(v);
};

export const step = (v: number, steps = 2) => {
   if (steps == 0) return 0;
   return Math.min(
      Math.floor(mod(v) * (steps + 1)) / steps,
      1
   );
}

export const getColor = (r: number, g: number = r, b: number = r, a: number = 1) => {
   const r_int = Math.floor(r * 256);
   const g_int = Math.floor(g * 256);
   const b_int = Math.floor(b * 256);
   return `rgb(${r_int}, ${g_int}, ${b_int}, ${a})`
}

export const lerpColor = (v: number, r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
   return getColor(
      lerp(v, r1, r2),
      lerp(v, g1, g2),
      lerp(v, b1, b2),
   )
}

export const download_url = (url: string, name?: string) => {
   const a = document.createElement('a')
   a.href = url
   a.download = name ?? ''
   a.click()
}

export type LayoutType = "stretch" | "fit" | "fill"
export type Layout = {
   width: number,
   height: number,
   size: number,
   min_size: number,
   max_size: number,
   screenX: (v: number) => number,
   screenY: (v: number) => number,
   screenSize: (v: number) => number,
}

export const getLayout = (type: LayoutType, width: number, height: number, padding = 0, x_range = 1, y_range = 1) => {
   const max_size = Math.max(width, height);
   const min_size = Math.min(width, height);

   const min_range = Math.min(x_range, y_range);
   const max_range = Math.max(x_range, y_range);

   switch (type) {
      case "stretch": {
         const size = min_size;
         const range = min_range;
         return {
            width,
            height,
            size,
            min_size,
            max_size,
            screenX: (v: number) => map(v / x_range, 0, 1, padding, 1 - padding) * width,
            screenY: (v: number) => map(v / y_range, 0, 1, padding, 1 - padding) * height,
            screenSize: (v: number) => map(v / range, 0, 1, 0, 1 - padding * 2) * size,
         }
      }
      case "fit": {
         const size = min_size
         const range = min_range;
         return {
            width,
            height,
            size,
            min_size,
            max_size,
            screenX: (v: number) => map(v / x_range, 0, 1, padding, 1 - padding) * size - (size - width) / 2,
            screenY: (v: number) => map(v / y_range, 0, 1, padding, 1 - padding) * size - (size - height) / 2,
            screenSize: (v: number) => map(v / range, 0, 1, 0, 1 - padding * 2) * size,
         }
      }
      case "fill": {
         const size = max_size;
         const range = max_range;
         return {
            width,
            height,
            size,
            min_size,
            max_size,
            screenX: (v: number) => map(v / x_range, 0, 1, padding, 1 - padding) * size - (size - width) / 2,
            screenY: (v: number) => map(v / y_range, 0, 1, padding, 1 - padding) * size - (size - height) / 2,
            screenSize: (v: number) => map(v / range, 0, 1, 0, 1 - padding * 2) * size,
         }
      }
   }
}

export function fillGrid(item_count: number, width: number, height: number) {
   let rows = 1;
   let cols = 1;
   while (rows * cols < item_count) {
      if (height > width) {
         if (cols <= rows) {
            cols++;
         } else {
            rows++;
         }
      } else {
         if (rows <= cols) {
            rows++;
         } else {
            cols++;
         }
      }
   }
   return { rows, cols };
}