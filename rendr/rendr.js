import { mod } from "./library/Utils";
// import SKETCH_PATH from "./sketch.js?url"
const SKETCH_PATH = "/sketches/sketch.js";
const ROOT_WORKER_NAME = "root";
const WORKER_NAME = self.name || ROOT_WORKER_NAME;
console.log("WORKER_NAME", WORKER_NAME);
let global_dependency_id = 0;
let global_dependencies = new Map();
let global_workers = new Set();
let global_sketch_id = 0;
let global_effect_dependencies_stack = [new Set()];
function global_effect_dependencies() {
    return global_effect_dependencies_stack.at(-1);
}
// let effectStack = [[]];
// const pushEffectStack = () => {
//    effectStack.push([]);
// }
// const popEffectStack = () => {
//    const popped = effectStack.pop();
//    popped.forEach(cleanup => cleanup());
// }
// const addEffectStack = (cleanup) => {
//    effectStack.at(-1).push(cleanup);
// }
export function resetGlobals() {
    global_dependencies = new Map();
    global_dependency_id = 0;
    global_workers = new Set();
    global_sketch_id = 0;
    global_effect_dependencies_stack = [new Set()];
}
export function cleanupGlobals() {
    global_dependencies.forEach(dependency => dependency.cleanup());
    global_workers.forEach(worker => worker.terminate());
}
export function createEffect(callback, options = { batch: false, batch_timeout_ms: 0 }) {
    let cleanup;
    let timeout;
    let dependencies;
    function call() {
        cleanup && cleanup();
        global_effect_dependencies_stack.push(new Set());
        const _cleanup = callback();
        dependencies = global_effect_dependencies_stack.pop() ?? new Set();
        const callbacks = [...dependencies].map(({ dependency }) => dependency.onChange(_callback));
        cleanup = () => {
            _cleanup && _cleanup();
            dependencies.forEach(({ dependency }) => dependency.unsubscribe(_callback));
        };
    }
    function _callback() {
        if (options.batch) {
            clearTimeout(timeout);
            timeout = setTimeout(() => call(), options.batch_timeout_ms);
        }
        else
            call();
    }
    call();
}
export function createCanvas(width, height) {
    const canvas = new OffscreenCanvas(width, height);
    return canvas;
}
export function isParameter(v) {
    return v.get !== undefined
        && v.set !== undefined
        && v.value !== undefined;
}
export function matchActionTest(match, action) {
    if (typeof match === "object") // @ts-ignore
        return Object.entries(match).every(([key, value]) => action[key] === value);
    if (typeof match === "function")
        return match(action);
    return false;
}
export function createParameter(initial_value, name) {
    if (name && typeof localStorage !== 'undefined') {
        const stored_value = localStorage[name];
        if (stored_value) {
            const parsed_value = JSON.parse(localStorage[name]);
            initial_value = parsed_value;
        }
    }
    const ret = {
        id: global_dependency_id++,
        value: initial_value,
        listeners: new Set(),
        name,
        last_set_timestamp: Date.now(),
        onMutate(match, callback) {
            this.listeners.add({ match, callback });
        },
        onChange(callback) {
            // this.listeners.add(callback);
            this.onMutate({ key: "value" }, callback);
        },
        unsubscribe(callback) {
            // this.listeners = new Set([...this.listeners].filter(c => c !== callback));
            this.listeners = new Set([...this.listeners].filter(({ callback: c }) => c !== callback));
        },
        hasListener(callback) {
            // return [...this.listeners].some(c => c === callback);
            return [...this.listeners].some(l => l.callback === callback);
        },
        mutate(action) {
            action.source ??= WORKER_NAME;
            const { key, value } = action; // @ts-ignore
            if (this[key] === value)
                return; // @ts-ignore
            this[key] = value;
            if (key === "value") {
                this.last_set_timestamp = Date.now();
                // this.mutate({ key: "last_set_timestamp", value: Date.now() });
                if (name && typeof localStorage !== 'undefined')
                    localStorage[name] = JSON.stringify(value);
            }
            this.listeners.forEach(({ match, callback }) => matchActionTest(match, action) && callback(this, action));
        },
        set(value) {
            this.mutate({ key: "value", value });
        },
        get() {
            global_effect_dependencies()?.add({ dependency: this });
            return this.value;
        },
        lastSetTimestamp() {
            return this.last_set_timestamp;
        },
        cleanup() {
            this.listeners.clear();
        }
    };
    global_dependencies.set(ret.id, ret);
    return ret;
}
export function createCache(count = 0) {
    const id = global_dependency_id++;
    // cache: n_arr(count, () => ({ valid: false })), 
    let cache = new Array(count);
    // cache: [],
    let listeners = new Set();
    let get_listeners = new Set();
    let last_set_timestamp = Date.now();
    let invalid_timestamp = Date.now();
    let invalidate_count = 0;
    function onMutate(match, callback) {
        listeners.add({ match, callback });
    }
    function onChange(callback) {
        onMutate({ key: "value" }, callback);
    }
    function hasListener(callback) {
        return [...listeners].some(l => l.callback === callback);
    }
    function onGet(callback) {
        get_listeners.add(callback);
    }
    function unsubscribe(callback) {
        listeners = new Set([...listeners].filter(l => l.callback !== callback));
        get_listeners = new Set([...get_listeners].filter(c => c !== callback));
    }
    function mutate(action) {
        action.source ??= WORKER_NAME;
        const { key, value, index } = action;
        if (index !== undefined) {
            // @ts-ignore
            if (cache[index]?.[key] === value)
                return;
            if (!cache[index])
                cache[index] = {};
            // @ts-ignore
            cache[index][key] = value;
            if (key === "value")
                cache[index].last_set_timestamp = Date.now();
            // if (key === "value") mutate({ key: "last_set_timestamp", index, value: Date.now() });
            if (index > count)
                count = index;
            if (action.validate)
                validate(index);
        }
        else {
            const _key = key === "value" ? "cache" : key; // @ts-ignore
            if (this[_key] === value)
                return; // @ts-ignore
            this[_key] = value;
            if (key === "value")
                last_set_timestamp = Date.now();
            // if (key === "value") mutate({ key: "last_set_timestamp", value: Date.now() });
        }
        listeners.forEach(({ match, callback }) => matchActionTest(match, action) && callback(ret, action));
    }
    function set(index, value) {
        if (index === undefined || value === undefined)
            console.warn("set, wrong arguments: index and value undefined");
        mutate({ key: "value", index, value });
        validate(index);
    }
    function invalidSet(index, value) {
        if (index === undefined || value === undefined)
            console.warn("set, wrong arguments: index and value undefined");
        mutate({ key: "value", index, value });
    }
    function get(...args) {
        if (args.length == 0)
            return _getAll();
        if (args.length == 1)
            return _getIndex(...args);
    }
    function _getAll() {
        get_listeners.forEach(callback => callback());
        global_effect_dependencies()?.add({ dependency: ret });
        return cache;
    }
    function _getIndex(index) {
        get_listeners.forEach(callback => callback(index));
        global_effect_dependencies()?.add({ dependency: ret, index });
        return cache[index]?.value;
    }
    function getLatest(index = count - 1) {
        get_listeners.forEach(callback => callback(index));
        if (cache[index]?.value !== undefined) {
            global_effect_dependencies()?.add({ dependency: ret, index });
            return cache[index].value;
        }
        global_effect_dependencies()?.add({ dependency: ret });
        for (let i = 0; i < count; i++) {
            const value = cache[mod(index - i, count)]?.value;
            if (value !== undefined)
                return value;
        }
    }
    function getLatestValid(index = count - 1) {
        get_listeners.forEach(callback => callback(index, true));
        if (isValid(index)) {
            global_effect_dependencies()?.add({ dependency: ret, index });
            return cache[index].value;
        }
        global_effect_dependencies()?.add({ dependency: ret });
        for (let i = 0; i < count; i++) {
            const item = cache[mod(index - i, count)];
            if (!item)
                continue;
            const { value, valid } = item;
            if (valid)
                return value;
        }
        return getLatest(index);
    }
    function isValid(index) {
        return cache[index]?.valid ?? false;
    }
    function validate(index) {
        if (!cache[index])
            cache[index] = {};
        // cache[index].valid = true;
        mutate({ key: "valid", value: true, index });
    }
    function invalidate(index, timestamp) {
        if (index === undefined) {
            _invalidateAll(timestamp);
        }
        else {
            _invalidateIndex(index, timestamp);
        }
    }
    function _invalidateAll(timestamp) {
        // for (let i = 0; i < count; i++) _invalidateIndex(i);
        cache.forEach((_, index) => _invalidateIndex(index, timestamp));
    }
    function _invalidateIndex(index, timestamp) {
        if (!cache[index])
            cache[index] = {};
        mutate({ key: "valid", value: false, index });
        // mutate({ key: "invalid_timestamp", value: timestamp ?? Date.now(), index });
        // mutate({ key: "invalidate_count", value: (cache[index].invalidate_count ?? 0) + 1, index });
        // cache[index].valid = false;
        cache[index].invalid_timestamp = timestamp ?? Date.now();
        cache[index].invalidate_count = (cache[index].invalidate_count ?? 0) + 1;
    }
    function invalidateFrom(index) {
        if (index === undefined) {
            invalidate(index);
        }
        else
            for (let i = index; i < count; i++)
                if (cache[i])
                    invalidate(i);
    }
    function invalidTimestamp(index) {
        if (index === undefined)
            return invalid_timestamp;
        return cache[index]?.invalid_timestamp;
    }
    function invalidateCount(index) {
        if (index === undefined)
            return invalidate_count;
        return cache[index]?.invalidate_count;
    }
    function lastSetTimestamp(index) {
        if (index === undefined)
            return last_set_timestamp;
        return cache[index]?.last_set_timestamp;
    }
    function clear(index) {
        if (index == null)
            cache = new Array(count);
        else
            cache[index] = {};
    }
    function cleanup() {
        listeners.clear();
        get_listeners.clear();
    }
    const ret = {
        id,
        count,
        cache,
        get,
        set,
        invalidSet,
        mutate,
        onMutate,
        onChange,
        onGet,
        hasListener,
        unsubscribe,
        getLatest,
        getLatestValid,
        isValid,
        invalidate,
        invalidateFrom,
        invalidateCount,
        invalidTimestamp,
        cleanup,
    };
    global_dependencies.set(ret.id, ret);
    return ret;
}
export function createSketch(fn) {
    function init(...args) {
        const name = `sketch ${global_sketch_id++}`;
        // const main_worker_name = ROOT_WORKER_NAME;
        const main_worker_name = `${name} main worker`;
        let worker_id = 0;
        const gen_worker_name = () => `${name} worker ${worker_id++}`;
        const sketch = constructSketch(name, main_worker_name, gen_worker_name);
        let _sketch_output = fn(sketch);
        let sketch_output = typeof _sketch_output === 'function'
            ? _sketch_output(...args)
            : _sketch_output;
        // return sketch_output;
        createWorker(sketch.main_worker_name, ROOT_WORKER_NAME, () => {
            for (const dependency of Object.values(sketch_output)) {
                dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && postMessage({ id, action }));
            }
            args.forEach(dependency => {
                dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && postMessage({ id, action }));
            });
            [...global_dependencies.values()].filter(dep => dep.name).forEach(dependency => {
                dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && postMessage({ id, action }));
            });
        }, (data) => {
            const { id, action } = data;
            const dependency = global_dependencies.get(id);
            dependency?.mutate(action);
        }, (worker) => {
            for (const dependency of Object.values(sketch_output)) {
                dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
            }
            args.forEach(dependency => {
                dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
            });
            [...global_dependencies.values()].filter(dep => dep.name).forEach(dependency => {
                // console.log(dependency);
                dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
                worker.postMessage({ id: dependency.id, action: { key: "value", value: dependency.get() } });
            });
        }, (data) => {
            const { id, action } = data;
            const dependency = global_dependencies.get(id);
            dependency?.mutate(action);
        });
        return sketch_output;
    }
    return {
        init,
    };
}
function constructSketch(name, main_worker_name, gen_worker_name) {
    function update(initial_state, callback) {
        const initial_state_par = isParameter(initial_state)
            ? initial_state
            : createParameter(initial_state);
        const state_par = createParameter(initial_state_par.value);
        const tick_par = createParameter(0);
        let state;
        const worker = createReactiveWorker(gen_worker_name(), main_worker_name, () => {
            const tick = tick_par.get();
            if (tick === 0)
                state = structuredClone(initial_state_par.get());
            state = callback(state, tick) ?? state;
            return state;
        }, (state) => state_par.set(state), (id) => {
            if (id === initial_state_par.id)
                tick_par.set(0);
            else if (id !== tick_par.id)
                tick_par.set(tick_par.value + 1);
        });
        return state_par;
    }
    function construct(initial_state, count_or_queue, interval_ms, callback) {
        const initial_state_par = isParameter(initial_state)
            ? initial_state
            : createParameter(initial_state);
        const state_par = createParameter(initial_state_par.value);
        let state;
        const worker = createReactiveQueueWorker(gen_worker_name(), main_worker_name, count_or_queue, interval_ms, (index, count, item) => {
            if (count <= index)
                index = 0;
            if (index === 0)
                state = structuredClone(initial_state_par.get());
            const new_state = callback(state, index, count, item);
            state = new_state ?? state;
            return state;
        }, (state) => state ?? initial_state_par.get(), (state) => state_par.set(state));
        return state_par;
    }
    function simulate(initial_state, count, callback) {
        const initial_state_par = isParameter(initial_state)
            ? initial_state
            : createParameter(initial_state);
        const index_par = createParameter({ index: 0, invalidate_count: undefined });
        const state_cache = createCache(count);
        state_cache.set(0, initial_state_par.get());
        let start_index = 0;
        const requestNextIndex = () => {
            for (let i = 0; i < count; i++) {
                const index = mod(start_index + i, count);
                if (!state_cache.isValid(index)) {
                    index_par.set({ index, invalidate_count: state_cache.invalidateCount(index) });
                    return;
                }
            }
        };
        requestNextIndex();
        const index_dependencies = [];
        const previous_states = [initial_state_par.get()];
        const worker = createReactiveWorker(gen_worker_name(), main_worker_name, () => {
            previous_states[0] = initial_state_par.get();
            const { index, invalidate_count } = index_par.get();
            const i = mod(index, count);
            let state = structuredClone(previous_states[i - 1]);
            const t = i / count;
            const new_state = callback(state, i, count, t);
            state = new_state ?? state;
            previous_states[i] = structuredClone(state);
            return { i, state, invalidate_count };
        }, ({ i, state, invalidate_count }, dependencies_ids_and_indexes) => {
            if (state_cache.isValid(i))
                return;
            if (state_cache.invalidateCount(i) !== invalidate_count)
                return;
            // if (state_cache[i] === undefined && dependencies_ids_and_indexes.length) {
            //    state_cache[i] = dependencies_ids_and_indexes;
            //    state_cache.invalidate(i);
            //    requestNextIndex();
            //    return;
            // }
            state_cache.set(i, state);
            // state_cache.invalidateFrom(i + 1)
            index_dependencies[i] = dependencies_ids_and_indexes;
            requestNextIndex();
        }, (dependency_id, dependency_index) => {
            if (dependency_id === index_par.id)
                return;
            index_dependencies.forEach((dependencies_ids_and_indexes, index) => {
                if (dependencies_ids_and_indexes.find(({ id, index }) => dependency_id === id && (index === undefined || index === dependency_index)))
                    // state_cache.invalidateFrom(index)
                    state_cache.invalidate(index);
            });
            requestNextIndex();
        });
        return state_cache;
    }
    // function simulateQueue(initial_state, count, callback, options = {}) {
    //    const state_cache = createCache(count);
    //    state_cache.set(0, initial_state);
    //    function invalidate(index) {
    //       state_cache.invalidate(index)
    //       const timestamp = state_cache.invalidTimestamp(index);
    //       worker.postMessage({ kind: "invalidate", index, timestamp });
    //    }
    //    const index_dependencies = [];
    //    const previous_states = [initial_state];
    //    const worker = createReactiveCacheWorker(
    //       gen_worker_name(),
    //       main_worker_name,
    //       state_cache,
    //       (index, timestamp) => {
    //          const i = mod(index, count);
    //          if (i === 0) {
    //             previous_states[0] = structuredClone(initial_state);
    //             return { i, state: previous_states[0], timestamp };
    //          }
    //          let state = structuredClone(previous_states[i - 1]);
    //          const t = i / count;
    //          const new_state = callback(state, i, t);
    //          state = new_state ?? state;
    //          previous_states[i] = state;
    //          return state
    //       },
    //       (state, index, timestamp, dependencies_ids_and_indexes) => {
    //          // if (state_cache.isValid(i)) return;
    //          if (state_cache.invalidTimestamp(index) !== timestamp) return
    //          for (let { id, index: dep_index } of dependencies_ids_and_indexes) {
    //             const dependency = global_dependencies.get(id);
    //             const last_set_timestamp = dependency.lastSetTimestamp(dep_index);
    //             if (timestamp < last_set_timestamp) {
    //                index_dependencies[index] = [];
    //                invalidate(index);
    //                return;
    //             }
    //          }
    //          // if (index_dependencies[index] === undefined && dependencies_ids_and_indexes.length) {
    //          //    index_dependencies[index] = [];
    //          //    invalidate(index);
    //          //    return
    //          // }
    //          state_cache.set(index, state);
    //          index_dependencies[index] = dependencies_ids_and_indexes;
    //       },
    //       (dependency_id, dependency_index) => {
    //          for (let [index, dependencies_ids_and_indexes] of index_dependencies.entries()) {
    //             if (!dependencies_ids_and_indexes) continue;
    //             if (dependencies_ids_and_indexes.find(({ id, index }) =>
    //                dependency_id === id && (index === undefined || index === dependency_index)
    //             )) {
    //                invalidate(index);
    //             }
    //          }
    //       },
    //       options,
    //    );
    //    return state_cache;
    // }
    function draw(callback) {
        const frame_par = createParameter(null);
        createReactiveWorker(gen_worker_name(), main_worker_name, () => {
            const canvas = callback();
            const ctx = canvas.getContext('2d');
            const bitmap = canvas.transferToImageBitmap();
            ctx?.drawImage(bitmap, 0, 0);
            return bitmap;
        }, (bitmap) => frame_par.set(bitmap));
        return frame_par;
    }
    function generate(count_or_queue, interval_ms, callback, options) {
        const frame_par = createParameter(null);
        const worker = createReactiveQueueWorker(gen_worker_name(), main_worker_name, count_or_queue, interval_ms, (index, count, item) => callback(index, count, item), (canvas) => {
            if (canvas === undefined)
                return;
            const bitmap = canvas.transferToImageBitmap();
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            return bitmap;
        }, (bitmap) => frame_par.set(bitmap), undefined, options);
        return frame_par;
    }
    function animate(frames, callback) {
        const index_par = createParameter({ index: 0, invalidate_count: 0 });
        const frame_cache = createCache(frames);
        let start_frame = 0;
        frame_cache.onGet((index, getLatestValid) => getLatestValid
            ? start_frame = 0
            : start_frame = index ?? 0);
        const requestNextFrame = () => {
            for (let i = 0; i < frames; i++) {
                const frame = mod(start_frame + i, frames);
                if (!frame_cache.isValid(frame)) {
                    const new_index = {
                        index: frame,
                        invalidate_count: frame_cache.invalidateCount(frame),
                    };
                    if (index_par.value?.index === new_index.index &&
                        index_par.value?.invalidate_count === new_index.invalidate_count) {
                        return;
                    }
                    index_par.set(new_index);
                    return;
                }
            }
        };
        requestNextFrame();
        const frames_dependencies = [];
        const worker = createReactiveWorker(gen_worker_name(), main_worker_name, () => {
            const { index, invalidate_count } = index_par.get();
            const i = mod(index, frames);
            const t = i / frames;
            const canvas = callback(i, t);
            const ctx = canvas.getContext('2d');
            const bitmap = canvas.transferToImageBitmap();
            ctx?.drawImage(bitmap, 0, 0);
            return { i, bitmap, invalidate_count };
        }, ({ i, bitmap, invalidate_count }, dependencies_ids_and_indexes) => {
            if (frame_cache.isValid(i))
                return;
            if (frame_cache.invalidateCount(i) !== invalidate_count) {
                // frames_dependencies[i] = dependencies_ids_and_indexes;
                frame_cache.invalidSet(i, bitmap);
                requestNextFrame();
                return;
            }
            // if (frames_dependencies[i] === undefined && dependencies_ids_and_indexes.length) {
            //    frames_dependencies[i] = dependencies_ids_and_indexes;
            //    frame_cache.invalidate(i);
            //    requestNextFrame();
            //    return;
            // }
            frame_cache.set(i, bitmap);
            frames_dependencies[i] = dependencies_ids_and_indexes;
            requestNextFrame();
        }, (dependency_id, dependency_index) => {
            if (dependency_id === index_par.id)
                return;
            frames_dependencies.forEach((dependencies_ids_and_indexes, frame) => {
                if (dependencies_ids_and_indexes.find(({ id, index }) => dependency_id === id && (index === undefined || index === dependency_index))) {
                    frame_cache.invalidate(frame);
                    // frames_dependencies[frame] = [];
                }
            });
            requestNextFrame();
        });
        return frame_cache;
    }
    // function animateQueue(frames, callback, options) {
    //    const frame_cache = createCache(frames);
    //    let start_frame = 0;
    //    frame_cache.onGet((index, getLatestValid) => {
    //       if (getLatestValid) start_frame = 0
    //       else start_frame = index
    //       // requestNextFrame();
    //    });
    //    function invalidate(index) {
    //       frame_cache.invalidate(index)
    //       const timestamp = frame_cache.invalidTimestamp(index);
    //       worker.postMessage({ kind: "invalidate", index, timestamp });
    //    }
    //    const frames_dependencies = []
    //    const worker = createReactiveCacheWorker(
    //       gen_worker_name(),
    //       main_worker_name,
    //       frame_cache,
    //       (index) => {
    //          const i = mod(index, frames);
    //          const t = i / frames;
    //          const canvas = callback(i, t);
    //          const ctx = canvas.getContext('2d');
    //          const bitmap = canvas.transferToImageBitmap();
    //          ctx.drawImage(bitmap, 0, 0);
    //          return bitmap
    //       },
    //       (bitmap, index, timestamp, dependencies_ids_and_indexes) => {
    //          // if (frame_cache.isValid(i)) return;
    //          if (frame_cache.invalidTimestamp(index) !== timestamp) {
    //             frame_cache.invalidSet(index, bitmap);
    //             return;
    //          }
    //          for (let { id, index: dep_index } of dependencies_ids_and_indexes) {
    //             const dependency = global_dependencies.get(id);
    //             const last_set_timestamp = dependency.lastSetTimestamp(dep_index);
    //             if (timestamp < last_set_timestamp) {
    //                invalidate(index);
    //                return;
    //             }
    //          }
    //          // if (frames_dependencies[index] === undefined && dependencies_ids_and_indexes.length) {
    //          //    frames_dependencies[index] = dependencies_ids_and_indexes;
    //          //    invalidate(index);
    //          //    return;
    //          // }
    //          frame_cache.set(index, bitmap);
    //          frames_dependencies[index] = dependencies_ids_and_indexes;
    //       },
    //       (dependency_id, dependency_index) => {
    //          frames_dependencies.forEach((dependencies_ids_and_indexes, frame) => {
    //             if (dependencies_ids_and_indexes.find(({ id, index }) =>
    //                dependency_id === id && (index === undefined || index === dependency_index)
    //             )) {
    //                invalidate(frame);
    //             }
    //          });
    //       },
    //       options
    //    );
    //    return frame_cache;
    // }
    return {
        name,
        main_worker_name,
        update,
        construct,
        simulate,
        // simulateQueue,
        draw,
        generate,
        animate,
        // animateQueue,
    };
}
export function createWorker(name, parent_name, executeWorker, receiveWorker, execute, receive) {
    if (WORKER_NAME === name) {
        addEventListener("message", (evt) => receiveWorker(evt.data));
        const res = executeWorker();
        if (res !== undefined)
            postMessage(res);
    }
    else if (WORKER_NAME === parent_name) {
        const worker = new Worker(new URL(SKETCH_PATH, import.meta.url), { type: "module", name });
        global_workers.add(worker);
        worker.addEventListener("message", (evt) => receive(evt.data));
        const res = execute(worker);
        if (res !== undefined)
            worker.postMessage(res);
        return worker;
    }
}
export function createReactiveWorker(name, parent_name, executeWorker, receive, onDependencyChanged) {
    const worker = createWorker(name, parent_name, () => {
        createEffect(() => {
            const ret = executeWorker();
            const dependencies_ids_and_indexes = [...(global_effect_dependencies() ?? [])]
                .map(({ dependency, index }) => ({ id: dependency.id, index }));
            if (ret !== undefined)
                postMessage({ value: ret, dependencies_ids_and_indexes });
        }, { batch: true });
    }, (data) => {
        const { id, action } = data;
        const dependency = global_dependencies.get(id);
        dependency?.mutate(action);
    }, (worker) => {
        // [...global_dependencies.values()].filter(dep => dep.name).forEach((dependency) => {
        //    dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
        // });
    }, (data) => {
        const { value, dependencies_ids_and_indexes } = data;
        receive(value, dependencies_ids_and_indexes);
        dependencies_ids_and_indexes.forEach(({ id, index }) => {
            const dep = global_dependencies.get(id);
            if (!dep) {
                console.warn("dependency not found", id, global_dependencies);
                return;
            }
            if (!dep.hasListener(onDepChange))
                onDepChange(dep, { key: "value", value: dep.get() });
            else
                dep.unsubscribe(onDepChange);
            dep.onChange(onDepChange);
        });
    });
    function onDepChange(dependency, action) {
        const { id } = dependency;
        worker?.postMessage({ id, action });
        onDependencyChanged && onDependencyChanged(dependency.id, action.index);
    }
    return worker;
}
export function createReactiveQueueWorker(name, parent_name, count_or_queue, interval_ms, executeWorker, send, receive, onDependencyChanged, options = {}) {
    const count_or_queue_par = isParameter(count_or_queue) ? count_or_queue : createParameter(count_or_queue);
    const { reset_on_count_change, reset_on_queue_change } = options;
    let queue_par;
    let count_par;
    const value = count_or_queue_par.get();
    if (typeof value === 'number')
        count_par = count_or_queue_par;
    else
        queue_par = count_or_queue_par;
    const retrig_par = createParameter(false);
    let index = 0;
    const worker = createWorker(name, parent_name, () => {
        let timeout;
        createEffect(() => {
            retrig_par.get();
            clearTimeout(timeout);
            work();
        }, { batch: true });
        function work() {
            global_effect_dependencies_stack.push(new Set());
            const queue = queue_par?.get();
            const count = queue ? queue.length : count_par.get();
            if (count > 0 && index >= count) {
                global_effect_dependencies_stack.pop();
                return;
            }
            let ret;
            const time = Date.now();
            for (; index < count && Date.now() - time < interval_ms; index++) {
                const item = queue && queue[index];
                ret = executeWorker(index, count, item);
            }
            const dependencies = global_effect_dependencies_stack.pop();
            const dependencies_ids_and_indexes = [...(dependencies ?? [])]
                .map(({ dependency, index }) => ({ id: dependency.id, index }));
            const value = send(ret);
            postMessage({ value, dependencies_ids_and_indexes });
            if (index != count) {
                clearTimeout(timeout);
                timeout = setTimeout(work);
            }
        }
    }, (data) => {
        const { id, action } = data;
        const { value } = action;
        const dependency = global_dependencies.get(id);
        if (!dependency) {
            console.warn("dependency not found", id, global_dependencies);
            return;
        }
        if (count_par?.id === id) {
            if (reset_on_count_change)
                index = 0;
            if (value <= index)
                index = 0;
        }
        else if (queue_par?.id === id) {
            if (reset_on_queue_change)
                index = 0;
            else if (value.length <= index)
                index = 0;
            else if (value.length === dependency.value.length)
                index = 0;
        }
        else {
            index = 0;
        }
        dependency.mutate(action);
        retrig_par.set(!retrig_par.value);
    }, (worker) => {
        // [...global_dependencies.values()].filter(dep => dep.name).forEach((dependency) => {
        //    dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
        // });
    }, (data) => {
        const { value, dependencies_ids_and_indexes } = data;
        receive(value, dependencies_ids_and_indexes);
        dependencies_ids_and_indexes.forEach(({ id, index }) => {
            const dep = global_dependencies.get(id);
            if (!dep) {
                console.warn("dependency not found", id, global_dependencies);
                return;
            }
            if (!dep.hasListener(onDepChange))
                onDepChange(dep, { key: "value", value: dep.get() });
            else
                dep.unsubscribe(onDepChange);
            dep.onChange(onDepChange);
        });
    });
    function onDepChange(dependency, action) {
        const { id } = dependency;
        worker?.postMessage({ id, action });
        onDependencyChanged && onDependencyChanged(id, action.index);
    }
    return worker;
}
// export function createReactiveCacheWorker(name, parent_name, cache, execute, receive, onDependencyChanged, options = {}) {
//    const { interval_ms, timeout_ms, batch_timeout_ms, max_queue_length } = options;
//    const retrig_par = createParameter(false);
//    const worker = createWorker(
//       name,
//       parent_name,
//       () => {
//          let timeout;
//          createEffect(() => {
//             retrig_par.get();
//             clearTimeout(timeout);
//             work();
//          }, {
//             batch: true,
//             batch_timeout_ms
//          });
//          function work() {
//             if (cache.count == 0) return;
//             const time = Date.now();
//             const polling = () => interval_ms === undefined || Date.now() - time <= interval_ms
//             const maxQueueLength = () => max_queue_length === undefined || queue_count < max_queue_length
//             let queue_count = 0;
//             let index;
//             for (index = 0; index < cache.count && polling() && maxQueueLength(); index++) {
//                if (cache.isValid(index)) continue;
//                const timestamp = cache.invalidTimestamp(index);
//                global_effect_dependencies_stack.push(new Set());
//                const ret = execute(index);
//                const dependencies = global_effect_dependencies_stack.pop();
//                const dependencies_ids_and_indexes = [...dependencies]
//                   .map(({ dependency, index }) => ({ id: dependency.id, index }));
//                postMessage({ value: ret, index, timestamp, dependencies_ids_and_indexes })
//                cache.set(index, ret);
//                queue_count++;
//             }
//             if (index != cache.count) {
//                clearTimeout(timeout);
//                timeout = setTimeout(work, timeout_ms);
//             }
//          }
//       },
//       (data) => {
//          const { kind } = data;
//          switch (kind) {
//             case "dependency":
//                const { id, action } = data;
//                const dependency = global_dependencies.get(id);
//                dependency.mutate(action);
//                retrig_par.set(!retrig_par.value)
//                break;
//             case "invalidate":
//                const { index, timestamp } = data;
//                cache.invalidate(index, timestamp);
//                retrig_par.set(!retrig_par.value)
//                break;
//          }
//       },
//       (worker) => {
//          // [...global_dependencies.values()].filter(dep => dep.name).forEach((dependency) => {
//          //    dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
//          // });
//       },
//       (data) => {
//          const { value, index, timestamp, dependencies_ids_and_indexes } = data;
//          receive(value, index, timestamp, dependencies_ids_and_indexes)
//          dependencies_ids_and_indexes.forEach(({ id, index }) => {
//             const dep = global_dependencies.get(id);
//             if (!dep.hasListener(onDepChange))
//                onDepChange(dep, { key: "value", value: dep.get() });
//             else
//                dep.unsubscribe(onDepChange);
//             dep.onChange(onDepChange);
//          });
//       },
//    );
//    function onDepChange(dependency, action) {
//       const { id } = dependency;
//       worker.postMessage({ kind: "dependency", id, action });
//       onDependencyChanged && onDependencyChanged(id, action.index);
//    }
//    return worker;
// }
// export function createLoop(callback, interval = 0) {
//    let timeout;
//    const loop = () => {
//       if (!ret.running) return
//       callback();
//       timeout = setTimeout(loop, interval);
//    }
//    const ret = {
//       stop() {
//          this.running = false;
//          clearTimeout(timeout);
//       },
//       start() {
//          this.running = true;
//          loop();
//       },
//       toggle() {
//          if (this.running)
//             this.stop();
//          else
//             this.start();
//       }
//    }
//    ret.start();
//    return ret;
// }