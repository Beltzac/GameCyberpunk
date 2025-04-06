// src/utils/Easing.ts
export class Easing {
    // Linear (no easing)
    static linear(t: number): number {
        return t;
    }

    // Quadratic
    static easeInQuad(t: number): number {
        return t * t;
    }

    static easeOutQuad(t: number): number {
        return t * (2 - t);
    }

    static easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    // Cubic
    static easeInCubic(t: number): number {
        return t * t * t;
    }

    static easeOutCubic(t: number): number {
        return (--t) * t * t + 1;
    }

    static easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    // Exponential
    static easeInExpo(t: number): number {
        return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
    }

    static easeOutExpo(t: number): number {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    static easeInOutExpo(t: number): number {
        if (t === 0) return 0;
        if (t === 1) return 1;
        if ((t /= 0.5) < 1) return 0.5 * Math.pow(2, 10 * (t - 1));
        return 0.5 * (-Math.pow(2, -10 * --t) + 2);
    }

    // Elastic
    static easeInElastic(t: number): number {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
    }

    static easeOutElastic(t: number): number {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
    }

    static easeInOutElastic(t: number): number {
        if (t === 0) return 0;
        if (t === 1) return 1;
        t *= 2;
        if (t < 1) return -0.5 * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
        return 0.5 * Math.pow(2, -10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI) + 1;
    }

    // Sine
    static easeInOutSine(t: number): number {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }
}