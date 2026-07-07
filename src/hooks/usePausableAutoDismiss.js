import { useCallback, useEffect, useRef } from "react";

export const usePausableAutoDismiss = (onDismiss, duration, active = true) => {
    const timerRef = useRef(null);
    const remainingMsRef = useRef(duration);
    const startedAtRef = useRef(0);
    const pausedRef = useRef(false);
    const onDismissRef = useRef(onDismiss);

    useEffect(() => {
        onDismissRef.current = onDismiss;
    }, [onDismiss]);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const scheduleDismiss = useCallback((ms) => {
        clearTimer();
        remainingMsRef.current = ms;
        startedAtRef.current = Date.now();
        timerRef.current = setTimeout(() => onDismissRef.current(), ms);
    }, [clearTimer]);

    useEffect(() => {
        if (!active) return undefined;

        pausedRef.current = false;
        remainingMsRef.current = duration;
        scheduleDismiss(duration);

        return clearTimer;
    }, [active, duration, scheduleDismiss, clearTimer]);

    const pause = useCallback(() => {
        if (!active || pausedRef.current) return;
        pausedRef.current = true;
        const elapsed = Date.now() - startedAtRef.current;
        remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
        clearTimer();
    }, [active, clearTimer]);

    const resume = useCallback(() => {
        if (!active || !pausedRef.current) return;
        pausedRef.current = false;
        if (remainingMsRef.current <= 0) {
            onDismissRef.current();
            return;
        }
        scheduleDismiss(remainingMsRef.current);
    }, [active, scheduleDismiss]);

    return {
        pause,
        resume,
        remainingMsRef,
        pausedRef,
        hoverHandlers: {
            onMouseEnter: pause,
            onMouseLeave: resume,
        },
    };
};
