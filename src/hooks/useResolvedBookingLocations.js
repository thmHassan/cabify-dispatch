import { useCallback, useEffect, useRef, useState } from "react";
import { getCachedMapConfiguration } from "../services/mapConfigCache";
import { fetchMapifyAddressFromCoords, isReverseGeocodingAvailable } from "../services/MapSearchService";
import {
    getBookingLocationDisplaySource,
    getBookingLocationDisplayValue,
} from "../utils/functions/locationDisplay";

export function useResolvedBookingLocations(bookings) {
    const [resolved, setResolved] = useState({});
    const [mapConfigReady, setMapConfigReady] = useState(() => Boolean(getCachedMapConfiguration()?.ok));
    const inflightRef = useRef(new Set());

    useEffect(() => {
        if (mapConfigReady) return undefined;

        const interval = setInterval(() => {
            if (getCachedMapConfiguration()?.ok) {
                setMapConfigReady(true);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [mapConfigReady]);

    useEffect(() => {
        if (!bookings?.length || !mapConfigReady || !isReverseGeocodingAvailable()) return undefined;

        const tasks = [];

        bookings.forEach((booking) => {
            if (!booking?.id) return;

            ["pickup_location", "destination_location"].forEach((field) => {
                const key = `${booking.id}-${field}`;
                const source = getBookingLocationDisplaySource(booking, field);
                if (!source.needsResolve || inflightRef.current.has(key)) return;

                inflightRef.current.add(key);
                tasks.push(
                    fetchMapifyAddressFromCoords({ lat: source.lat, lon: source.lng })
                        .then((address) => ({
                            key,
                            address: address || source.fallback,
                        }))
                        .catch(() => ({ key, address: source.fallback }))
                        .finally(() => {
                            inflightRef.current.delete(key);
                        })
                );
            });
        });

        if (!tasks.length) return undefined;

        let cancelled = false;

        Promise.all(tasks).then((results) => {
            if (cancelled) return;

            setResolved((prev) => {
                const next = { ...prev };
                results.forEach(({ key, address }) => {
                    if (address) next[key] = address;
                });
                return next;
            });
        });

        return () => {
            cancelled = true;
        };
    }, [bookings, mapConfigReady]);

    const getLocationDisplay = useCallback(
        (booking, field) => {
            if (!booking) return "N/A";

            const key = `${booking.id}-${field}`;
            return getBookingLocationDisplayValue(booking, field, resolved[key]);
        },
        [resolved]
    );

    return { getLocationDisplay, resolvedLocations: resolved };
}
