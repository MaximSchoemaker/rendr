import { createSignal, type Component, type JSX } from 'solid-js';
import { Parameter } from "../rendr/rendr"

export type NumberInputSettings = {
}

type NumberInputProps = {
    initialValue: number,
    onChange: (value: number) => void,
    settings?: NumberInputSettings,
    style?: JSX.CSSProperties,
}

export const NumberInput: Component<NumberInputProps> = (props) => {
    const [value, setValue] = createSignal()

    return <input type="number" value={props.initialValue} style={props.style}
        onInput={(e) => {
            const newValue = parseFloat((e.target as HTMLInputElement).value);
            setValue(newValue);
            props.onChange(newValue);
        }}
    />;
}