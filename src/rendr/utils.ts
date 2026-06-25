import { onCleanup } from "solid-js";

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

export const roundTo = (val: number, step: number) => {
   return Math.round(val * step) / step;
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

export const angle_diff = (a1: number, a2: number) => mod(a1 - a2 + 0.5) - 0.5;

export const createColor = (r: number, g: number = r, b: number = r, a: number = 1) => {
   const r_int = Math.floor(r * 256);
   const g_int = Math.floor(g * 256);
   const b_int = Math.floor(b * 256);
   return `rgb(${r_int}, ${g_int}, ${b_int}, ${a})`
}

export const createHSL = (h: number, s: number = 1.0, l: number = 0.5, a: number = 1) => {
   const h_int = Math.floor(h * 360);
   const s_int = Math.floor(s * 100);
   const l_int = Math.floor(l * 100);
   return `hsl(${h_int}, ${s_int}%, ${l_int}%, ${a})`
}

export const lerpColor = (v: number, r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, a = 1) => {
   return createColor(
      lerp(v, r1, r2),
      lerp(v, g1, g2),
      lerp(v, b1, b2),
      a
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
   padding: number,
   x_range: number,
   y_range: number,
   offset_x: number,
   offset_y: number,

   min_size: number,
   max_size: number,
   size: number,
   min_range: number,
   max_range: number,
   range: number,

   getX: (v: number) => number,
   getY: (v: number) => number,
   getSize: (v: number) => number,
}

export const getLayout = (type: LayoutType,
   width: number, height: number,
   padding = 0,
   x_range = 1, y_range = 1,
   offset_x = 0, offset_y = 0
) => {

   const props = {
      width,
      height,
      padding,
      x_range,
      y_range,
      offset_x,
      offset_y,

      get min_size() { return Math.min(this.width, this.height); },
      get max_size() { return Math.max(this.width, this.height); },
      get min_range() { return Math.min(this.x_range, this.y_range); },
      get max_range() { return Math.max(this.x_range, this.y_range); },
   }

   switch (type) {
      case "stretch": {
         return {
            ...props,

            get size(): number { return this.min_size; },
            get range(): number { return this.min_range; },

            getX(x: number) {
               return map((x + this.offset_x) / this.x_range, 0, 1, this.padding, 1 - this.padding) * this.width
            },
            getY(y: number) {
               return map((y + this.offset_y) / this.y_range, 0, 1, this.padding, 1 - this.padding) * this.height
            },
            getSize(size: number) {
               return map(size / this.range, 0, 1, 0, 1 - this.padding * 2) * this.size
            }
         }
      }
      case "fit": {
         return {
            ...props,

            get size(): number { return this.min_size; },
            get range(): number { return this.min_range; },

            getX(x: number) {
               return map((x + this.offset_x) / this.x_range, 0, 1, this.padding, 1 - this.padding) * this.size - (this.size - this.width) / 2;
            },
            getY(y: number) {
               return map((y + this.offset_y) / this.y_range, 0, 1, this.padding, 1 - this.padding) * this.size - (this.size - this.height) / 2
            },
            getSize(size: number) {
               return map(size / this.range, 0, 1, 0, 1 - this.padding * 2) * this.size
            }
         }
      }
      case "fill": {
         return {
            ...props,

            get size(): number { return this.max_size; },
            get range(): number { return this.max_range; },

            getX(x: number) {
               return map((x + this.offset_x) / this.x_range, 0, 1, this.padding, 1 - this.padding) * this.size - (this.size - this.width) / 2;
            },
            getY(y: number) {
               return map((y + this.offset_y) / this.y_range, 0, 1, this.padding, 1 - this.padding) * this.size - (this.size - this.height) / 2
            },
            getSize(size: number) {
               return map(size / this.range, 0, 1, 0, 1 - this.padding * 2) * this.size
            }
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

export type Pointer = {
   x: number,
   y: number,
   down: boolean,
}

export function registerPointers(el: HTMLElement, pointers: Pointer[]) {
   function setPointerCoords(index: number, x: number, y: number) {
      const rect = el.getBoundingClientRect();

      x -= rect.left;
      y -= rect.top;

      const size = Math.min(rect.width, rect.height);
      const pointer = getPointer(index);
      pointer.x = (x - (rect.width - size) / 2) / size;
      pointer.y = (y - (rect.height - size) / 2) / size;
   }

   function getPointer(index: number) {
      if (pointers[index]) return pointers[index];
      const new_pointer = { x: 0.5, y: 0.5, down: false };
      pointers[index] = new_pointer;
      return new_pointer;
   }

   const onMouseDown = (e: MouseEvent) => getPointer(0).down = true;
   const onMouseUp = (e: MouseEvent) => getPointer(0).down = false;
   const onMouseMove = (e: MouseEvent) => setPointerCoords(0, e.clientX, e.clientY)

   const onTouchStart = (e: TouchEvent) => {
      for (const touch of e.changedTouches) {
         setPointerCoords(touch.identifier, touch.clientX, touch.clientY);
         getPointer(touch.identifier).down = true;
      }
   }
   const onTouchEnd = (e: TouchEvent) => {
      for (const touch of e.changedTouches) {
         getPointer(touch.identifier).down = false
      }
   }
   const onTouchMove = (e: TouchEvent) => {
      for (const touch of e.changedTouches) {
         setPointerCoords(touch.identifier, touch.clientX, touch.clientY);
      }
   }

   el.addEventListener("mousedown", onMouseDown);
   el.addEventListener("mouseup", onMouseUp);
   el.addEventListener("mousemove", onMouseMove);

   el.addEventListener("touchstart", onTouchStart);
   el.addEventListener("touchend", onTouchEnd);
   el.addEventListener("touchmove", onTouchMove);


   onCleanup(() => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);

      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchmove", onTouchMove);
   })
}

export function keyDown(key: string, callback: () => void) {
   const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === key) callback();
   }

   window.addEventListener("keydown", onKeyDown);

   onCleanup(() => {
      window.removeEventListener("keydown", onKeyDown);
   })
}

export function keyUp(key: string, callback: () => void) {
   const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === key) callback();
   }

   window.addEventListener("keyup", onKeyUp);

   onCleanup(() => {
      window.removeEventListener("keyup", onKeyUp);
   })
}

export function keyState(key: string) {
   let down = false;

   keyDown(key, () => down = true);
   keyUp(key, () => down = false);

   return () => down;
}