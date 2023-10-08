import { mod } from "./library/Utils.js";
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
    const id = global_dependency_id++;
    let listeners = new Set();
    let set_counter = 0;
    function onMutate(match, callback) {
        listeners.add({ match, callback });
    }
    function onChange(callback) {
        onMutate({ key: "value" }, callback);
    }
    function unsubscribe(callback) {
        listeners = new Set([...listeners].filter(({ callback: c }) => c !== callback));
    }
    function hasListener(callback) {
        return [...listeners].some(l => l.callback === callback);
    }
    function mutate(action) {
        action.source ??= WORKER_NAME;
        const { key, value, set_count } = action; // @ts-ignore
        if (parameter[key] === value)
            return; // @ts-ignore
        parameter[key] = value;
        if (key === "value") {
            set_counter = set_count ?? set_counter + 1;
            action.set_count = set_counter;
            // mutate({ key: "set_counter", value: set_counter });
            if (name && typeof localStorage !== 'undefined')
                localStorage[name] = JSON.stringify(value);
        }
        listeners.forEach(({ match, callback }) => matchActionTest(match, action) && callback(parameter, action));
    }
    function set(value) {
        mutate({ key: "value", value });
    }
    function get() {
        global_effect_dependencies()?.add({ dependency: parameter });
        return parameter.value;
    }
    function setCount() {
        return set_counter;
    }
    function cleanup() {
        listeners.clear();
    }
    const parameter = {
        id,
        value: initial_value,
        listeners,
        name,
        set_counter,
        onMutate,
        onChange,
        unsubscribe,
        hasListener,
        mutate,
        set,
        get,
        setCount,
        cleanup,
    };
    global_dependencies.set(parameter.id, parameter);
    return parameter;
}
export function createCache(count = 0) {
    const id = global_dependency_id++;
    let listeners = new Set();
    let set_counter = 0;
    function onMutate(match, callback) {
        listeners.add({ match, callback });
    }
    function onChange(callback) {
        onMutate({ key: "value" }, callback);
    }
    function hasListener(callback) {
        return [...listeners].some(l => l.callback === callback);
    }
    function unsubscribe(callback) {
        listeners = new Set([...listeners].filter(l => l.callback !== callback));
    }
    function mutate(action) {
        action.source ??= WORKER_NAME;
        const { key, value, index, set_count } = action;
        if (index !== undefined) {
            // @ts-ignore
            if (cache.value[index]?.[key] === value)
                return;
            if (!cache.value[index])
                cache.value[index] = {};
            // @ts-ignore
            cache.value[index][key] = value;
            if (key === "value") {
                cache.value[index].set_counter = set_count ?? (cache.value[index].set_counter ?? 0) + 1;
                // mutate({ key: "set_counter", index, value: Date.now() });
                action.set_count = cache.value[index].set_counter;
            }
            if (index > count)
                count = index;
            if (action.validate)
                validate(index);
        }
        else {
            // @ts-ignore
            if (cache[key] === value)
                return;
            if (value == null) {
                clear(); // @ts-ignore
            }
            else
                cache[key] = value;
            if (key === "value") {
                set_counter = set_count ?? set_counter + 1;
                mutate({ key: "set_counter", value: Date.now() });
                action.set_count = set_counter;
            }
        }
        listeners.forEach(({ match, callback }) => matchActionTest(match, action) && callback(cache, action));
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
        global_effect_dependencies()?.add({ dependency: cache });
        return cache.value;
    }
    function _getIndex(index) {
        global_effect_dependencies()?.add({ dependency: cache, index });
        return cache.value[index]?.value;
    }
    function getLatest(index = count - 1) {
        if (cache.value[index]?.value !== undefined) {
            global_effect_dependencies()?.add({ dependency: cache, index });
            return cache.value[index].value;
        }
        global_effect_dependencies()?.add({ dependency: cache });
        for (let i = index; i >= 0; i--) {
            const value = cache.value[i]?.value;
            if (value !== undefined)
                return value;
        }
    }
    function getLatestValid(index = count - 1) {
        if (isValid(index)) {
            global_effect_dependencies()?.add({ dependency: cache, index });
            return cache.value[index].value;
        }
        global_effect_dependencies()?.add({ dependency: cache });
        for (let i = index; i >= 0; i--) {
            const item = cache.value[i];
            if (!item)
                continue;
            const { value, valid } = item;
            if (valid)
                return value;
        }
        // return getLatest(index);
    }
    function isValid(index) {
        return cache.value[index]?.valid ?? false;
    }
    function validate(index) {
        if (!cache.value[index])
            cache.value[index] = {};
        mutate({ key: "valid", value: true, index });
    }
    function invalidate(index, invalidate_count) {
        if (index === undefined) {
            _invalidateAll(invalidate_count);
        }
        else {
            _invalidateIndex(index, invalidate_count);
        }
    }
    function _invalidateAll(invalidate_count) {
        // for (let i = 0; i < count; i++) _invalidateIndex(i);
        cache.value.forEach((_, index) => _invalidateIndex(index, invalidate_count));
    }
    function _invalidateIndex(index, invalidate_count) {
        if (!cache.value[index])
            cache.value[index] = {};
        // if (!cache.value[index].valid) return;
        mutate({ key: "valid", value: false, index });
        // mutate({ key: "invalidate_count", value: (cache.value[index].invalidate_count ?? 0) + 1, index });
        cache.value[index].invalidate_count = invalidate_count ?? (cache.value[index].invalidate_count ?? 0) + 1;
    }
    function invalidateFrom(index) {
        if (index === undefined) {
            invalidate(index);
        }
        else
            for (let i = index; i < count; i++)
                if (cache.value[i])
                    invalidate(i);
    }
    function invalidateCount(index) {
        if (index === undefined)
            console.warn("wrong invalidateCount call");
        return cache.value[index]?.invalidate_count;
    }
    function setCount(index) {
        if (index === undefined)
            return set_counter;
        return cache.value[index]?.set_counter;
    }
    function clear(index) {
        if (index == null)
            cache.value = new Array(count);
        else
            cache.value[index] = {};
    }
    function request(index) {
        mutate({ key: "request_index", value: index });
    }
    function requestIndex() {
        return cache.request_index;
    }
    function cleanup() {
        listeners.clear();
    }
    const cache = {
        id,
        count,
        value: new Array(count),
        get,
        set,
        invalidSet,
        mutate,
        onMutate,
        onChange,
        hasListener,
        unsubscribe,
        getLatest,
        getLatestValid,
        isValid,
        invalidate,
        invalidateFrom,
        invalidateCount,
        setCount,
        request,
        request_index: 0,
        requestIndex,
        cleanup,
    };
    global_dependencies.set(id, cache);
    return cache;
}
export function createSketch(fn) {
    function init(...args) {
        const name = `sketch ${global_sketch_id++}`;
        const main_worker_name = ROOT_WORKER_NAME;
        let worker_id = 0;
        const gen_worker_name = () => `${name} worker ${worker_id++}`;
        const sketch = constructSketch(name, main_worker_name, gen_worker_name);
        let _sketch_output = fn(sketch);
        let sketch_output = typeof _sketch_output === 'function'
            ? _sketch_output(...args)
            : _sketch_output;
        return sketch_output;
    }
    return {
        init,
    };
}
export function createSketchWorker(fn) {
    function init(...args) {
        const name = `sketch ${global_sketch_id++}`;
        const main_worker_name = `${name} main worker`;
        let worker_id = 0;
        const gen_worker_name = () => `${name} worker ${worker_id++}`;
        const sketch = constructSketch(name, main_worker_name, gen_worker_name);
        let _sketch_output = fn(sketch);
        let sketch_output = typeof _sketch_output === 'function'
            ? _sketch_output(...args)
            : _sketch_output;
        createWorker(main_worker_name, ROOT_WORKER_NAME, () => {
            for (const dependency of Object.values(sketch_output)) {
                dependency?.onMutate({}, ({ id }, action) => action.source !== ROOT_WORKER_NAME && postMessage({ id, action: { ...action, source: WORKER_NAME } }));
            }
            args.forEach(dependency => {
                dependency?.onMutate({}, ({ id }, action) => action.source !== ROOT_WORKER_NAME && postMessage({ id, action: { ...action, source: WORKER_NAME } }));
            });
            [...global_dependencies.values()].filter(dep => dep.name).forEach(dependency => {
                dependency?.onMutate({}, ({ id }, action) => action.source !== ROOT_WORKER_NAME && postMessage({ id, action: { ...action, source: WORKER_NAME } }));
            });
        }, (data) => {
            const { id, action } = data;
            const dependency = global_dependencies.get(id);
            dependency?.mutate(action);
        }, (worker) => {
            for (const dependency of Object.values(sketch_output)) {
                dependency?.onMutate({}, ({ id }, action) => action.source !== main_worker_name && worker.postMessage({ id, action: { ...action, source: WORKER_NAME } }));
            }
            args.forEach(dependency => {
                dependency?.onMutate({}, ({ id }, action) => action.source !== main_worker_name && worker.postMessage({ id, action: { ...action, source: WORKER_NAME } }));
            });
            [...global_dependencies.values()].filter(dep => dep.name).forEach(dependency => {
                // console.log(dependency);
                dependency?.onMutate({}, ({ id }, action) => action.source !== main_worker_name && worker.postMessage({ id, action: { ...action, source: WORKER_NAME } }));
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
function createSetup(callback) {
    function setup(createUI) {
        resetGlobals();
        callback(createUI);
        return () => {
            cleanupGlobals();
        };
    }
    if (WORKER_NAME !== ROOT_WORKER_NAME)
        setup(() => { });
    return setup;
}
function constructSketch(name, main_worker_name, gen_worker_name) {
    function update(initial_state, callback) {
        const initial_state_par = isParameter(initial_state)
            ? initial_state
            : createParameter(initial_state);
        const state_par = createParameter(initial_state_par.value);
        const tick_par = createParameter(0);
        let state;
        const worker = createReactiveWorker(gen_worker_name(), main_worker_name, {
            executeWorker: () => {
                const tick = tick_par.get();
                if (tick === 0)
                    state = structuredClone(initial_state_par.get());
                state = callback(state, tick) ?? state;
                return state;
            },
            receive: (state) => state_par.set(state),
            onDependencyChanged: (id) => {
                if (id === initial_state_par.id)
                    tick_par.set(0);
                else if (id !== tick_par.id)
                    tick_par.set(tick_par.value + 1);
            }
        });
        return state_par;
    }
    function construct(initial_state, count_or_queue, interval_ms, callback) {
        const initial_state_par = isParameter(initial_state)
            ? initial_state
            : createParameter(initial_state);
        const state_par = createParameter(initial_state_par.value);
        let state;
        const worker = createReactiveQueueWorker(gen_worker_name(), main_worker_name, count_or_queue, interval_ms, {
            executeWorker: (index, count, item) => {
                if (count <= index)
                    index = 0;
                if (index === 0)
                    state = structuredClone(initial_state_par.get());
                const new_state = callback(state, index, count, item);
                state = new_state ?? state;
                return state;
            },
            // (data) => { },
            sendWorker: (state) => state ?? initial_state_par.get(),
            // (worker) => { },
            receive: (state) => state_par.set(state),
            // (id, index) => { },
        });
        return state_par;
    }
    function simulate(initial_state, count, callback, options = {}) {
        options = { strategy: "ping", ...options };
        const state_cache = createCache(count);
        state_cache.set(0, initial_state);
        const previous_states = [initial_state];
        const worker = createReactiveCacheWorker(gen_worker_name(), main_worker_name, state_cache, {
            executeWorker: (index) => {
                const i = mod(index, count);
                if (i === 0) {
                    previous_states[0] = structuredClone(initial_state);
                    return previous_states[0];
                }
                let state = structuredClone(previous_states[i - 1]);
                const t = i / count;
                const new_state = callback(state, i, count, t);
                state = new_state ?? state;
                previous_states[i] = state;
                return state;
            },
        }, options);
        return state_cache;
    }
    function draw(callback) {
        const frame_par = createParameter(null);
        createReactiveWorker(gen_worker_name(), main_worker_name, {
            executeWorker: () => {
                const canvas = callback();
                const ctx = canvas.getContext('2d');
                const bitmap = canvas.transferToImageBitmap();
                ctx?.drawImage(bitmap, 0, 0);
                return bitmap;
            },
            receive: (bitmap) => frame_par.set(bitmap),
        });
        return frame_par;
    }
    function generate(count_or_queue, interval_ms, callback, options) {
        const frame_par = createParameter(undefined);
        const worker = createReactiveQueueWorker(gen_worker_name(), main_worker_name, count_or_queue, interval_ms, {
            executeWorker: callback,
            sendWorker: (canvas) => {
                if (canvas === undefined)
                    return;
                const bitmap = canvas.transferToImageBitmap();
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(bitmap, 0, 0);
                return bitmap;
            },
            receive: (bitmap) => frame_par.set(bitmap),
        }, options);
        return frame_par;
    }
    function animate(frames, callback, options) {
        options = { invalid_set: true, ...options };
        const frame_cache = createCache(frames);
        const worker = createReactiveCacheWorker(gen_worker_name(), main_worker_name, frame_cache, {
            executeWorker: (index) => {
                const i = mod(index, frames);
                const t = i / frames;
                const canvas = callback(i, t);
                const ctx = canvas.getContext('2d');
                const bitmap = canvas.transferToImageBitmap();
                ctx?.drawImage(bitmap, 0, 0);
                return bitmap;
            },
        }, options);
        return frame_cache;
    }
    return {
        createCanvas,
        createParameter,
        createCache,
        update,
        construct,
        simulate,
        draw,
        generate,
        animate,
    };
}
export function createWorker(name, parent_name, executeWorker, receiveWorker, execute, receive) {
    if (WORKER_NAME === name) {
        addEventListener("message", (evt) => receiveWorker?.(evt.data));
        const res = executeWorker?.();
        if (res !== undefined)
            postMessage(res);
    }
    else if (WORKER_NAME === parent_name) {
        const worker = new Worker(new URL(SKETCH_PATH, import.meta.url), { type: "module", name });
        global_workers.add(worker);
        worker.addEventListener("message", (evt) => receive?.(evt.data));
        const res = execute?.(worker);
        if (res !== undefined)
            worker.postMessage(res);
        return worker;
    }
}
export function createReactiveWorker(name, parent_name, { executeWorker, receiveWorker, execute, receive, onDependencyChanged, }) {
    const dependecy_records = [];
    const hasDependencyRecord = (id, index) => dependecy_records.some(r => r.id === id && r.index === index);
    const addDependencyRecord = (id, index) => dependecy_records.push({ id, index });
    const retrig_par = createParameter(false);
    const worker = createWorker(name, parent_name, () => {
        createEffect(() => {
            retrig_par.get();
            const ret = executeWorker?.();
            const dependencies_ids_and_indexes = [...(global_effect_dependencies() ?? [])]
                .map(({ dependency, index }) => ({ id: dependency.id, index, set_count: dependency.setCount(index) }));
            if (ret !== undefined)
                postMessage({ value: ret, dependencies_ids_and_indexes });
        }, { batch: true });
    }, (data) => {
        const { id, action } = data;
        const dependency = global_dependencies.get(id);
        if (!dependency) {
            console.warn("dependency not found", id, global_dependencies);
            return;
        }
        // console.log(action);
        dependency.mutate(action);
        retrig_par.set(!retrig_par.value);
        receiveWorker?.(data);
    }, execute, (data) => {
        const { value, dependencies_ids_and_indexes } = data;
        receive?.(value, dependencies_ids_and_indexes);
        dependencies_ids_and_indexes.forEach(({ id, index, set_count }) => {
            const dep = global_dependencies.get(id);
            if (!dep) {
                console.warn("dependency not found", id, global_dependencies);
                return;
            }
            if (!dep.hasListener(onDepChange)) {
                onDepChange(dep, { key: "value", value: dep.get(), set_count: dep.setCount() });
            }
            else {
                dep.unsubscribe(onDepChange);
            }
            if (!hasDependencyRecord(id, index)) {
                const current_set_count = dep.setCount(index);
                if (set_count !== current_set_count) {
                    onDepChange(dep, { key: "value", index, value: dep.get(index), set_count: current_set_count });
                }
            }
            dep.onChange(onDepChange);
        });
    });
    function onDepChange(dependency, action) {
        const { id } = dependency;
        worker?.postMessage({ id, action });
        const { index } = action;
        addDependencyRecord(id, index);
        onDependencyChanged?.(dependency.id, index);
    }
    return worker;
}
export function createReactiveQueueWorker(name, parent_name, count_or_queue, interval_ms, { executeWorker, receiveWorker, sendWorker, execute, receive, onDependencyChanged, }, options = {}) {
    const count_or_queue_par = isParameter(count_or_queue) ? count_or_queue : createParameter(count_or_queue);
    const { reset_on_count_change, reset_on_queue_change } = options;
    let queue_par;
    let count_par;
    const value = count_or_queue_par.get();
    if (typeof value === 'number')
        count_par = count_or_queue_par;
    else
        queue_par = count_or_queue_par;
    let index = 0;
    let timeout;
    const worker = createReactiveWorker(name, parent_name, {
        executeWorker: () => {
            clearTimeout(timeout);
            work();
            function work() {
                if (!executeWorker)
                    return;
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
                const value = sendWorker?.(ret);
                postMessage({ value, dependencies_ids_and_indexes });
                if (index != count) {
                    clearTimeout(timeout);
                    timeout = setTimeout(work);
                }
            }
        },
        receiveWorker: (data) => {
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
            receiveWorker?.(data);
        },
        execute,
        receive,
        onDependencyChanged,
    });
    return worker;
}
export function createReactiveCacheWorker(name, parent_name, cache, { executeWorker, receiveWorker, execute, receive, onDependencyChanged, }, options = {}) {
    options = { max_queue_length: 1, strategy: "interval", ...options };
    const { interval_ms, max_queue_length, invalid_set, strategy } = options;
    const dependecy_records = [];
    const hasDependencyRecord = (id, index) => dependecy_records.some(r => r.id === id && r.index === index);
    const addDependencyRecord = (id, index) => dependecy_records.push({ id, index });
    const retrig_par = createParameter(false);
    const worker = createWorker(name, parent_name, () => {
        let timeout;
        createEffect(() => {
            retrig_par.get();
            clearTimeout(timeout);
            work();
        }, {
            batch: true,
        });
        function work() {
            if (cache.count == 0)
                return;
            if (strategy === "interval") {
                clearTimeout(timeout);
                timeout = setTimeout(work, interval_ms);
            }
            const maxQueueLength = () => max_queue_length === undefined || queue_count < max_queue_length;
            let queue_count = 0;
            for (let i = 0; i < cache.count && maxQueueLength(); i++) {
                const index = mod(i + cache.requestIndex(), cache.count);
                if (cache.isValid(index))
                    continue;
                const invalidate_count = cache.invalidateCount(index);
                global_effect_dependencies_stack.push(new Set());
                const ret = executeWorker?.(index);
                const dependencies = global_effect_dependencies_stack.pop();
                const dependencies_ids_and_indexes = [...(dependencies ?? [])]
                    .map(({ dependency, index }) => ({ id: dependency.id, index }));
                postMessage({ value: ret, index, invalidate_count, dependencies_ids_and_indexes });
                if (ret !== undefined)
                    cache.set(index, ret);
                queue_count++;
            }
        }
    }, (data) => {
        const { kind } = data;
        switch (kind) {
            case "dependency":
                const { id, action } = data;
                const dependency = global_dependencies.get(id);
                dependency?.mutate(action);
                receiveWorker?.(data);
                break;
            case "invalidate":
                const { index, invalidate_count } = data;
                cache.invalidate(index, invalidate_count);
                break;
            case "retrig":
                retrig_par.set(!retrig_par.value);
                break;
        }
    }, (worker) => {
        execute?.(worker);
        // [...global_dependencies.values()].filter(dep => dep.name).forEach((dependency) => {
        //    dependency?.onMutate({}, ({ id }, action) => action.source === WORKER_NAME && worker.postMessage({ id, action }));
        // });
    }, (data) => {
        const { value, index, invalidate_count, dependencies_ids_and_indexes } = data;
        receive?.(value, index, invalidate_count, dependencies_ids_and_indexes);
        index_dependencies[index] = dependencies_ids_and_indexes;
        if (cache.invalidateCount(index) !== invalidate_count) {
            if (invalid_set)
                cache.invalidSet(index, value);
        }
        else
            cache.set(index, value);
        dependencies_ids_and_indexes.forEach(({ id, index, set_count }) => {
            const dep = global_dependencies.get(id);
            if (!dep) {
                console.warn("dependency not found", id, global_dependencies);
                return;
            }
            if (!dep.hasListener(onDepChange)) {
                onDepChange(dep, { key: "value", value: dep.get(), set_count: dep.setCount() });
            }
            else {
                dep.unsubscribe(onDepChange);
            }
            if (!hasDependencyRecord(id, index)) {
                const current_set_count = dep.setCount(index);
                if (set_count !== current_set_count) {
                    onDepChange(dep, { key: "value", index, value: dep.get(index), set_count: current_set_count });
                }
            }
            dep.onChange(onDepChange);
        });
        if (strategy === "ping")
            retrig();
    });
    let retrig_timeout;
    function retrig() {
        clearTimeout(retrig_timeout);
        retrig_timeout = setTimeout(() => worker?.postMessage({ kind: "retrig" }));
    }
    const index_dependencies = [];
    function invalidate(index) {
        cache.invalidate(index);
        const invalidate_count = cache.invalidateCount(index);
        worker?.postMessage({ kind: "invalidate", index, invalidate_count });
    }
    function onDepChange(dependency, action) {
        const { id } = dependency;
        worker?.postMessage({ kind: "dependency", id, action });
        retrig();
        const { index } = action;
        addDependencyRecord(id, index);
        index_dependencies.forEach((dependencies_ids_and_indexes, i) => {
            if (dependencies_ids_and_indexes.find((dep) => dep.id === id && (dep.index === undefined || dep.index === index))) {
                invalidate(i);
            }
        });
        onDependencyChanged && onDependencyChanged(id, index);
    }
    cache.onMutate({ key: "request_index" }, ({ id }, action) => worker?.postMessage({ kind: "dependency", id, action }));
    return worker;
}
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
export default {
    createSketch,
    createSketchWorker,
    createSetup,
    createParameter,
    createCache,
    createCanvas,
};
