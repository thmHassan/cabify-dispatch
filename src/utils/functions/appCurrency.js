import { apiGetCompanyProfile } from "../../services/SettingsConfigurationServices";
import { canAccessTenantApi } from "./tokenEncryption";
import {
    getTenantCurrencyCode,
    normalizeCurrencyCode,
    setCachedTenantCurrency,
} from "./formatters";
import {
    getTenantDistanceUnit,
    setCachedDistanceUnit,
} from "./tenantSettings";

const COMPANY_CURRENCY_STORAGE_KEY = "company_currency";
const COMPANY_UNITS_STORAGE_KEY = "company_units";
const COMPANY_NUMERIC_ID_STORAGE_KEY = "company_numeric_id";

let cachedCompanyNumericId = null;
let settingsLoadPromise = null;
const currencyListeners = new Set();
const unitsListeners = new Set();

const readStoredCurrency = () => {
    try {
        return sessionStorage.getItem(COMPANY_CURRENCY_STORAGE_KEY);
    } catch {
        return null;
    }
};

const writeStoredCurrency = (currency) => {
    try {
        sessionStorage.setItem(COMPANY_CURRENCY_STORAGE_KEY, currency);
    } catch {
        // ignore storage errors
    }
};

const readStoredUnits = () => {
    try {
        return sessionStorage.getItem(COMPANY_UNITS_STORAGE_KEY);
    } catch {
        return null;
    }
};

const writeStoredUnits = (units) => {
    try {
        sessionStorage.setItem(COMPANY_UNITS_STORAGE_KEY, units);
    } catch {
        // ignore storage errors
    }
};

const writeStoredCompanyNumericId = (companyId) => {
    try {
        sessionStorage.setItem(COMPANY_NUMERIC_ID_STORAGE_KEY, String(companyId));
    } catch {
        // ignore storage errors
    }
};

const notifyCurrencyListeners = (currency) => {
    currencyListeners.forEach((listener) => listener(currency));
};

export const subscribeCompanyCurrency = (listener) => {
    currencyListeners.add(listener);
    return () => currencyListeners.delete(listener);
};

export const subscribeCompanyUnits = (listener) => {
    unitsListeners.add(listener);
    return () => unitsListeners.delete(listener);
};

export const setCompanyCurrency = (currency) => {
    const raw = String(currency ?? "").trim();
    if (!raw) return;

    const normalized = normalizeCurrencyCode(raw);

    const previous = getTenantCurrencyCode();
    setCachedTenantCurrency(normalized);
    writeStoredCurrency(normalized);

    if (previous !== normalized) {
        notifyCurrencyListeners(normalized);
    }
};

export const setCompanyUnits = (units) => {
    const normalized = String(units ?? "").trim();
    if (!normalized) return;

    const previous = getTenantDistanceUnit();
    setCachedDistanceUnit(normalized);
    writeStoredUnits(normalized);

    if (previous !== getTenantDistanceUnit()) {
        unitsListeners.forEach((listener) => listener(getTenantDistanceUnit()));
    }
};

export const clearCompanyCurrencyCache = () => {
    cachedCompanyNumericId = null;
    settingsLoadPromise = null;
    try {
        sessionStorage.removeItem(COMPANY_CURRENCY_STORAGE_KEY);
        sessionStorage.removeItem(COMPANY_UNITS_STORAGE_KEY);
        sessionStorage.removeItem(COMPANY_NUMERIC_ID_STORAGE_KEY);
    } catch {
        // ignore storage errors
    }
};

const storeCompanyNumericId = (companyId) => {
    if (companyId == null || companyId === "") return;
    cachedCompanyNumericId = String(companyId);
    writeStoredCompanyNumericId(cachedCompanyNumericId);
};

const extractCurrencyFromProfileResponse = (response) =>
    response?.data?.data?.currency
    ?? response?.data?.currency
    ?? null;

const extractUnitsFromProfileResponse = (response) =>
    response?.data?.data?.units
    ?? response?.data?.units
    ?? null;

const fetchCompanySettingsFromApi = async () => {
    if (!canAccessTenantApi()) {
        return {
            currency: getTenantCurrencyCode(),
            units: getTenantDistanceUnit(),
        };
    }

    const profileResponse = await apiGetCompanyProfile();
    const profileId = profileResponse?.data?.data?.id;
    if (profileId != null) {
        storeCompanyNumericId(profileId);
    }

    const profileCurrency = extractCurrencyFromProfileResponse(profileResponse);
    const profileUnits = extractUnitsFromProfileResponse(profileResponse);
    if (profileCurrency) setCompanyCurrency(profileCurrency);
    if (profileUnits) setCompanyUnits(profileUnits);

    return {
        currency: getTenantCurrencyCode(),
        units: getTenantDistanceUnit(),
    };
};

export const refreshCompanyCurrency = async () => {
    try {
        const settings = await fetchCompanySettingsFromApi();
        return settings.currency;
    } catch {
        const storedCurrency = readStoredCurrency();
        if (storedCurrency) {
            setCompanyCurrency(storedCurrency);
        }
        const storedUnits = readStoredUnits();
        if (storedUnits) {
            setCompanyUnits(storedUnits);
        }
        return getTenantCurrencyCode();
    }
};

export const refreshCompanyUnits = async () => {
    try {
        const settings = await fetchCompanySettingsFromApi();
        return settings.units;
    } catch {
        const storedUnits = readStoredUnits();
        if (storedUnits) {
            setCompanyUnits(storedUnits);
        }
        return getTenantDistanceUnit();
    }
};

export const refreshCompanySettings = async () => {
    try {
        return await fetchCompanySettingsFromApi();
    } catch {
        const storedCurrency = readStoredCurrency();
        if (storedCurrency) setCompanyCurrency(storedCurrency);
        const storedUnits = readStoredUnits();
        if (storedUnits) setCompanyUnits(storedUnits);
        return {
            currency: getTenantCurrencyCode(),
            units: getTenantDistanceUnit(),
        };
    }
};

export const ensureCompanyCurrencyLoaded = async () => {
    const settings = await ensureCompanySettingsLoaded();
    return settings.currency;
};

export const ensureCompanyUnitsLoaded = async () => {
    const settings = await ensureCompanySettingsLoaded();
    return settings.units;
};

const storedCurrencyOnBoot = readStoredCurrency();
if (storedCurrencyOnBoot) {
    setCachedTenantCurrency(storedCurrencyOnBoot);
}

export const ensureCompanySettingsLoaded = async () => {
    if (!canAccessTenantApi()) {
        return {
            currency: getTenantCurrencyCode(),
            units: getTenantDistanceUnit(),
        };
    }

    if (!settingsLoadPromise) {
        settingsLoadPromise = refreshCompanySettings().finally(() => {
            settingsLoadPromise = null;
        });
    }

    return settingsLoadPromise;
};
