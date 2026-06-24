import { getTenantData } from "./tokenEncryption";
import { getTenantCountryIso } from "./tenantSettings";
import { parseBookingDate } from "./bookingDateFilter";
import {
    formatCompanyBookingCalendarDate,
    formatCompanyDateText,
    formatCompanyDateTime,
    formatDateForInputInCompanyTimezone,
    getCompanyNow,
    getCompanyTimestampIso,
} from "./appDateTime";

export { formatDateForInputInCompanyTimezone as formatDateForInput };

/** Company-supported ISO currency codes (from company profile / admin settings). */
export const SUPPORTED_CURRENCY_CODES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

const CURRENCY_SYMBOLS = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    INR: "₹",
    CAD: "$",
    AUD: "$",
};

const CURRENCY_LOCALE_MAP = {
    USD: "en-US",
    EUR: "en-IE",
    GBP: "en-GB",
    INR: "en-IN",
    CAD: "en-CA",
    AUD: "en-AU",
};

const COUNTRY_CURRENCY_MAP = {
    US: "USD",
    GB: "GBP",
    IN: "INR",
    CA: "CAD",
    AU: "AUD",
    IE: "EUR",
    DE: "EUR",
    FR: "EUR",
    ES: "EUR",
    IT: "EUR",
    NL: "EUR",
};

const COUNTRY_LOCALE_MAP = {
    US: "en-US",
    GB: "en-GB",
    IN: "en-IN",
    BD: "en-GB",
    AU: "en-AU",
    CA: "en-CA",
    AE: "en-GB",
};

const DEFAULT_LOCALE = "en-GB";
const DEFAULT_CURRENCY = "USD";

let cachedCurrencyCode = null;

export const normalizeCurrencyCode = (code) => {
    const normalized = String(code ?? "").trim().toUpperCase();
    if (!normalized) return DEFAULT_CURRENCY;
    if (SUPPORTED_CURRENCY_CODES.includes(normalized)) return normalized;
    return normalized;
};

const normalizeTenant = () => {
    const raw = getTenantData();
    if (!raw) return null;
    return raw?.data ?? raw;
};

export const setCachedTenantCurrency = (currency) => {
    if (currency) {
        cachedCurrencyCode = normalizeCurrencyCode(currency);
    }
};

export const clearCachedTenantCurrency = () => {
    cachedCurrencyCode = null;
};

export const getTenantCurrencyCode = () => {
    if (cachedCurrencyCode) return cachedCurrencyCode;

    const tenant = normalizeTenant();
    const currency = tenant?.currency;
    if (currency) return normalizeCurrencyCode(currency);

    const country = getTenantCountryIso();
    if (country && COUNTRY_CURRENCY_MAP[country]) {
        return COUNTRY_CURRENCY_MAP[country];
    }

    return DEFAULT_CURRENCY;
};

export const getCurrencySymbol = (currencyCode) => {
    const code = normalizeCurrencyCode(currencyCode || getTenantCurrencyCode());
    return CURRENCY_SYMBOLS[code] || code;
};

export const getCurrencyLocale = (currencyCode) => {
    const code = normalizeCurrencyCode(currencyCode || getTenantCurrencyCode());
    return CURRENCY_LOCALE_MAP[code] || getTenantLocale();
};

export const getTenantLocale = () => {
    const country = getTenantCountryIso();
    if (country && COUNTRY_LOCALE_MAP[country]) {
        return COUNTRY_LOCALE_MAP[country];
    }
    return DEFAULT_LOCALE;
};

export const formatAmountDecimal = (amount, options = {}) => {
    const fallback = options.fallback ?? "-";
    if (amount === null || amount === undefined || amount === "") return fallback;
    const num = Number(amount);
    if (Number.isNaN(num)) return String(amount);
    const locale = options.locale || getCurrencyLocale(options.currency);
    return num.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export const formatCurrency = (amount, options = {}) => {
    const fallback = options.fallback ?? "-";
    if (amount === null || amount === undefined || amount === "") return fallback;

    const num = Number(amount);
    if (Number.isNaN(num)) return String(amount);

    const currency = normalizeCurrencyCode(options.currency || getTenantCurrencyCode());
    const symbol = getCurrencySymbol(currency);
    const formattedAmount = formatAmountDecimal(num, {
        fallback,
        currency,
        locale: options.locale,
    });

    if (options.symbolOnly) {
        return `${symbol} ${formattedAmount}`;
    }

    return `${symbol}${options.symbolSpaced === false ? "" : " "}${formattedAmount}`;
};

export const formatBookingDate = (value, fallback = "—") =>
    formatCompanyBookingCalendarDate(value, fallback);

export const formatDate = (value, fallback = "-") => formatCompanyDateText(value, fallback);

export const formatDateTime = (value, fallback = "-") => formatCompanyDateTime(value, fallback);

export const formatTime = (value, fallback = "—") => {
    if (!value) return fallback;
    if (String(value).toLowerCase() === "asap") return "ASAP";
    const parts = String(value).split(":");
    if (parts.length >= 2) {
        return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return String(value);
};

export const formatPickupTime = (booking, fallback = "—") => {
    if (!booking) return fallback;

    if (typeof booking === "string") return formatTime(booking, fallback);

    if (booking.pickup_time_type === "asap") return "ASAP";
    if (String(booking.pickup_time || "").toLowerCase() === "asap") return "ASAP";

    const timeValue =
        booking.pickup_time ||
        booking.scheduled_pickup_time ||
        booking.pickup_time_formatted;

    if (booking.pickup_time_type === "time" || booking.is_scheduled || booking.pre_booking) {
        return formatTime(timeValue, fallback);
    }

    return formatTime(timeValue, fallback);
};

export const formatReminderMinutes = (minutes, fallback = "") => {
    if (minutes === null || minutes === undefined || minutes === "") return fallback;
    const value = Number(minutes);
    if (Number.isNaN(value)) return fallback;
    return `${value} min before pickup`;
};

export const formatReminderLabel = (minutes, fallback = "—") => {
    if (minutes === null || minutes === undefined || minutes === "") return fallback;
    const value = Number(minutes);
    if (Number.isNaN(value)) return fallback;
    return `${value} min`;
};

export const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";

    const now = getCompanyNow();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
};

export const toBookingDateInputValue = (value) =>
    formatDateForInputInCompanyTimezone(parseBookingDate(value));

export { getCompanyTimestampIso };
