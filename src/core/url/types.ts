export type URLContext = {
    getValue: (key: string) => string | null;
    replaceState: (key: string, value: string) => void;
    pushState: (key: string, value: string) => void;
    onPopState: (changeState: (value: string | null, isPop: boolean) => void) => () => void;
};

