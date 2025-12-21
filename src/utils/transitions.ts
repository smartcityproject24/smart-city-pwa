import type { TransitionConfig } from "svelte/transition";

export type SlideDirection = "left" | "right" | "top" | "bottom";

export interface SlideOptions {
    duration?: number;
    direction?: SlideDirection;
}

/**
 * Кастомный transition для слайда в указанном направлении
 * @param node - DOM элемент
 * @param options - Опции transition (duration, direction)
 * @returns TransitionConfig
 */
export function slide(
    node: Element,
    {
        duration = 300,
        direction = "right"
    }: SlideOptions = {}
): TransitionConfig {
    const getTransform = (t: number, eased: number) => {
        const offset = (1 - eased) * 100;
        
        switch (direction) {
            case "right":
                return `transform: translateX(${offset}%);`;
            case "left":
                return `transform: translateX(-${offset}%);`;
            case "bottom":
                return `transform: translateY(${offset}%);`;
            case "top":
                return `transform: translateY(-${offset}%);`;
            default:
                return `transform: translateX(${offset}%);`;
        }
    };

    return {
        duration,
        css: (t) => {
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            return getTransform(t, eased);
        }
    };
}

