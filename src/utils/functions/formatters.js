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

const CURRENCY_SYMBOLS = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AUD: "A$",
    CAD: "C$",
    AED: "د.إ",
    BDT: "৳",
    PKR: "Rs",
    SAR: "﷼",
    QAR: "QR",
    KWD: "KD",
    OMR: "OMR",
    BHD: "BD",
};

const COUNTRY_CURRENCY_MAP = {
    BD: "BDT",
    IN: "INR",
    US: "USD",
    GB: "GBP",
    AU: "AUD",
    CA: "CAD",
    AE: "AED",
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
const DEFAULT_CURRENCY = "INR";

let cachedCurrencyCode = null;

const normalizeTenant = () => {
    const raw = getTenantData();
    if (!raw) return null;
    return raw?.data ?? raw;
};

export const setCachedTenantCurrency = (currency) => {
    if (currency) {
        cachedCurrencyCode = String(currency).trim().toUpperCase();
    }
};

export const clearCachedTenantCurrency = () => {
    cachedCurrencyCode = null;
};

export const getTenantCurrencyCode = () => {
    if (cachedCurrencyCode) return cachedCurrencyCode;

    const tenant = normalizeTenant();
    const currency = tenant?.currency;
    if (currency) return String(currency).trim().toUpperCase();

    const country = getTenantCountryIso();
    if (country && COUNTRY_CURRENCY_MAP[country]) {
        return COUNTRY_CURRENCY_MAP[country];
    }

    return DEFAULT_CURRENCY;
};

export const getCurrencySymbol = (currencyCode) => {
    const code = (currencyCode || getTenantCurrencyCode()).toUpperCase();
    return CURRENCY_SYMBOLS[code] || code;
};

export const getTenantLocale = () => {
    const country = getTenantCountryIso();
    if (country && COUNTRY_LOCALE_MAP[country]) {
        return COUNTRY_LOCALE_MAP[country];
    }
    return DEFAULT_LOCALE;
};

export const formatAmountDecimal = (amount, fallback = "-") => {
    if (amount === null || amount === undefined || amount === "") return fallback;
    const num = Number(amount);
    if (Number.isNaN(num)) return String(amount);
    return num.toLocaleString(getTenantLocale(), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export const formatCurrency = (amount, options = {}) => {
    const fallback = options.fallback ?? "-";
    if (amount === null || amount === undefined || amount === "") return fallback;

    const num = Number(amount);
    if (Number.isNaN(num)) return String(amount);

    const currency = (options.currency || getTenantCurrencyCode()).toUpperCase();
    const locale = options.locale || getTenantLocale();

    if (options.symbolOnly) {
        return `${getCurrencySymbol(currency)} ${formatAmountDecimal(num, fallback)}`;
    }

    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            minimumFractionDigits: options.minimumFractionDigits ?? 2,
            maximumFractionDigits: options.maximumFractionDigits ?? 2,
        }).format(num);
    } catch {
        return `${getCurrencySymbol(currency)} ${formatAmountDecimal(num, fallback)}`;
    }
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
