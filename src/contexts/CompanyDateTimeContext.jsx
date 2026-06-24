import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../store";
import {
    ensureCompanySettingsLoaded,
    refreshCompanySettings,
    subscribeCompanyCurrency,
    subscribeCompanyUnits,
} from "../utils/functions/appCurrency";
import {
    ensureCompanyTimezoneLoaded,
    getCompanyTimezone,
    refreshCompanyTimezone,
    subscribeCompanyTimezone,
} from "../utils/functions/appDateTime";
import {
    formatCurrency as formatCurrencyValue,
    getCurrencySymbol,
    getTenantCurrencyCode,
} from "../utils/functions/formatters";
import { getTenantDistanceUnit } from "../utils/functions/tenantSettings";
import {
    canAccessTenantApi,
    isAuthenticated,
    resolveTenantDatabaseId,
} from "../utils/functions/tokenEncryption";

const CompanyDateTimeContext = createContext({
    timezone: getCompanyTimezone(),
    currency: getTenantCurrencyCode(),
    currencySymbol: getCurrencySymbol(),
    units: getTenantDistanceUnit(),
    ready: false,
    formatCurrency: (amount, options = {}) =>
        formatCurrencyValue(amount, { ...options, currency: getTenantCurrencyCode() }),
});

export const CompanyDateTimeProvider = ({ children }) => {
    const signedIn = useAppSelector((state) => state.auth.session.signedIn);
    const [timezone, setTimezone] = useState(getCompanyTimezone);
    const [currency, setCurrency] = useState(getTenantCurrencyCode);
    const [units, setUnits] = useState(getTenantDistanceUnit);
    const [ready, setReady] = useState(false);

    const canLoadTenantSettings = Boolean(
        signedIn && isAuthenticated() && resolveTenantDatabaseId()
    );

    useEffect(() => {
        if (!canLoadTenantSettings) {
            setReady(false);
            return undefined;
        }

        let cancelled = false;

        const applySettings = ({ nextTimezone, nextCurrency, nextUnits }) => {
            if (cancelled) return;
            if (nextTimezone) setTimezone(nextTimezone);
            if (nextCurrency) setCurrency(nextCurrency);
            if (nextUnits) setUnits(nextUnits);
            setReady(true);
        };

        Promise.all([
            ensureCompanyTimezoneLoaded(),
            ensureCompanySettingsLoaded(),
        ]).then(([nextTimezone, settings]) => {
            applySettings({
                nextTimezone,
                nextCurrency: settings?.currency,
                nextUnits: settings?.units,
            });
        });

        const unsubscribeTimezone = subscribeCompanyTimezone((nextTimezone) => {
            if (!cancelled) {
                setTimezone(nextTimezone);
                setReady(true);
            }
        });

        const unsubscribeCurrency = subscribeCompanyCurrency((nextCurrency) => {
            if (!cancelled) {
                setCurrency(nextCurrency);
                setReady(true);
            }
        });

        const unsubscribeUnits = subscribeCompanyUnits((nextUnits) => {
            if (!cancelled) {
                setUnits(nextUnits);
                setReady(true);
            }
        });

        const handleRefresh = () => {
            if (!canAccessTenantApi()) return;

            Promise.all([
                refreshCompanyTimezone(),
                refreshCompanySettings(),
            ]).then(([nextTimezone, settings]) => {
                applySettings({
                    nextTimezone,
                    nextCurrency: settings?.currency,
                    nextUnits: settings?.units,
                });
            });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                handleRefresh();
            }
        };

        window.addEventListener("focus", handleRefresh);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            cancelled = true;
            unsubscribeTimezone();
            unsubscribeCurrency();
            unsubscribeUnits();
            window.removeEventListener("focus", handleRefresh);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [canLoadTenantSettings]);

    const formatCurrency = useCallback(
        (amount, options = {}) =>
            formatCurrencyValue(amount, { ...options, currency: options.currency || currency }),
        [currency]
    );

    const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency]);

    const value = useMemo(
        () => ({ timezone, currency, currencySymbol, units, ready, formatCurrency }),
        [timezone, currency, currencySymbol, units, ready, formatCurrency]
    );

    return (
        <CompanyDateTimeContext.Provider value={value}>
            {children}
        </CompanyDateTimeContext.Provider>
    );
};

export const useCompanyDateTime = () => useContext(CompanyDateTimeContext);

export default CompanyDateTimeProvider;
