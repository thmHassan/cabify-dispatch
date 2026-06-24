import { apiGetCompanyProfile } from "../../services/SettingsConfigurationServices";
import { canAccessTenantApi } from "./tokenEncryption";

const COMPANY_TIMEZONE_STORAGE_KEY = "company_timezone";
const DEFAULT_APP_LOCALE = "en-GB";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let cachedTimezone = null;
let timezoneLoadPromise = null;
const timezoneListeners = new Set();

const notifyTimezoneListeners = (timezone) => {
    timezoneListeners.forEach((listener) => listener(timezone));
};

export const subscribeCompanyTimezone = (listener) => {
    timezoneListeners.add(listener);
    return () => timezoneListeners.delete(listener);
};

export const APP_DATE_DISPLAY_OPTIONS = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
};

export const APP_DATE_TEXT_OPTIONS = {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
};

export const APP_DATE_TIME_DISPLAY_OPTIONS = {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
};

export const APP_CLOCK_DISPLAY_OPTIONS = {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
};

/** Parse booking_date as calendar date (avoids UTC timezone shift on YYYY-MM-DD). */
export const parseCalendarDate = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const raw = String(value).trim();
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch.map(Number);
        return new Date(y, m - 1, d);
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const readStoredTimezone = () => {
    try {
        return sessionStorage.getItem(COMPANY_TIMEZONE_STORAGE_KEY);
    } catch {
        return null;
    }
};

const writeStoredTimezone = (timezone) => {
    try {
        sessionStorage.setItem(COMPANY_TIMEZONE_STORAGE_KEY, timezone);
    } catch {
        // ignore storage errors
    }
};

export const setCompanyTimezone = (timezone) => {
    const normalized = String(timezone ?? "").trim();
    if (!normalized) return;
    const changed = cachedTimezone !== normalized;
    cachedTimezone = normalized;
    writeStoredTimezone(normalized);
    if (changed) {
        notifyTimezoneListeners(normalized);
    }
};

export const clearCompanyTimezoneCache = () => {
    cachedTimezone = null;
    timezoneLoadPromise = null;
    try {
        sessionStorage.removeItem(COMPANY_TIMEZONE_STORAGE_KEY);
    } catch {
        // ignore storage errors
    }
};

export const getCompanyTimezone = () => {
    if (cachedTimezone) return cachedTimezone;

    const stored = readStoredTimezone();
    if (stored) {
        return stored;
    }

    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
};

const fetchCompanyTimezoneFromApi = async () => {
    if (!canAccessTenantApi()) {
        return getCompanyTimezone();
    }

    const response = await apiGetCompanyProfile();
    const profileTimezone = response?.data?.data?.company_timezone;
    if (profileTimezone) {
        setCompanyTimezone(profileTimezone);
    }
    return getCompanyTimezone();
};

export const refreshCompanyTimezone = async () => {
    try {
        return await fetchCompanyTimezoneFromApi();
    } catch {
        return getCompanyTimezone();
    }
};

export const ensureCompanyTimezoneLoaded = async () => {
    if (!canAccessTenantApi()) {
        return getCompanyTimezone();
    }

    if (!timezoneLoadPromise) {
        timezoneLoadPromise = refreshCompanyTimezone().finally(() => {
            timezoneLoadPromise = null;
        });
    }

    return timezoneLoadPromise;
};

const buildPartsMap = (date, timeZone, options) => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        ...options,
    });

    return Object.fromEntries(
        formatter
            .formatToParts(date)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value])
    );
};

export const getZonedParts = (date = new Date(), timeZone = getCompanyTimezone()) => {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return null;

    const parts = buildPartsMap(value, timeZone, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "short",
        hour12: false,
    });

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second),
        weekday: parts.weekday,
    };
};

export const getCompanyNow = () => new Date();

export const getCompanyNowParts = () => getZonedParts(getCompanyNow());

export const getCompanyTodayForInput = () => {
    const parts = getCompanyNowParts();
    if (!parts) return "";
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
};

export const getCompanyTodayWeekdayLabel = () => {
    const parts = getCompanyNowParts();
    if (!parts?.weekday) return WEEKDAY_LABELS[new Date().getDay()];
    return parts.weekday;
};

export const formatDateForInputInCompanyTimezone = (date) => {
    if (!date) return getCompanyTodayForInput();

    if (date instanceof Date) {
        if (Number.isNaN(date.getTime())) return "";
        const parts = getZonedParts(date);
        if (!parts) return "";
        return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    }

    const parsed = parseCalendarDate(date);
    if (!parsed) return "";
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

export const formatInCompanyTimezone = (
    value,
    options,
    { fallback = "-", locale = DEFAULT_APP_LOCALE, timeZone = getCompanyTimezone() } = {}
) => {
    if (!value) return fallback;

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;

    try {
        return new Intl.DateTimeFormat(locale, {
            timeZone,
            ...options,
        }).format(date);
    } catch {
        return date.toLocaleString(locale, options);
    }
};

export const formatCompanyDate = (value, fallback = "—") =>
    formatInCompanyTimezone(value, APP_DATE_DISPLAY_OPTIONS, { fallback });

export const formatCompanyDateText = (value, fallback = "-") =>
    formatInCompanyTimezone(value, APP_DATE_TEXT_OPTIONS, { fallback }).replace(",", "");

export const formatCompanyDateTime = (value, fallback = "-") =>
    formatInCompanyTimezone(value, APP_DATE_TIME_DISPLAY_OPTIONS, { fallback }).replace(",", "");

export const formatCompanyClock = (value = getCompanyNow()) =>
    formatInCompanyTimezone(value, APP_CLOCK_DISPLAY_OPTIONS, { fallback: "" });

export const formatCompanyTimeForApi = (date = getCompanyNow()) => {
    const parts = getZonedParts(date);
    if (!parts) return "00:00:00";
    return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}`;
};

export const getCompanyTimestampIso = (date = getCompanyNow()) => date.toISOString();

export const isCompanyToday = (dateValue) => {
    const date = parseCalendarDate(dateValue);
    const today = getCompanyTodayForInput();
    if (!date || !today) return false;
    return formatDateForInputInCompanyTimezone(date) === today;
};

export const isCompanyFutureDate = (dateValue) => {
    const date = parseCalendarDate(dateValue);
    const today = getCompanyTodayForInput();
    if (!date || !today) return false;
    return formatDateForInputInCompanyTimezone(date) > today;
};

const parseBookingDateParts = (bookingDate) => {
    const parsed = parseCalendarDate(bookingDate);
    if (!parsed) return null;
    return {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate(),
    };
};

export const formatCompanyBookingCalendarDate = (value, fallback = "—") => {
    const parsed = parseCalendarDate(value);
    if (!parsed) return fallback;

    const anchor = new Date(Date.UTC(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        12,
        0,
        0
    ));

    return formatInCompanyTimezone(anchor, APP_DATE_DISPLAY_OPTIONS, { fallback });
};

export const isCompanyFutureDateTime = (bookingDate, pickupTime = "00:00") => {
    const now = getCompanyNowParts();
    const dateParts = parseBookingDateParts(bookingDate);
    if (!now || !dateParts) return false;

    const [hour = 0, minute = 0] = String(pickupTime)
        .split(":")
        .map((part) => Number(part) || 0);

    if (dateParts.year !== now.year) return dateParts.year > now.year;
    if (dateParts.month !== now.month) return dateParts.month > now.month;
    if (dateParts.day !== now.day) return dateParts.day > now.day;
    if (hour !== now.hour) return hour > now.hour;
    return minute > now.minute;
};
