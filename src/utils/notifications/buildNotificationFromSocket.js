import { formatBookingDate, formatReminderMinutes, formatTime } from "../functions/formatters";
import {
    NEAREST_DISPATCH_FAILURE_FALLBACK,
    sanitizeNearestDispatchMessage,
} from "./nearestDispatchMessages";
import {
    sanitizePlotDispatchMessage,
} from "./plotDispatchMessages";

export const parseSocketPayload = (rawData) => {
  if (!rawData) return null;
  if (typeof rawData === "string") {
    try {
      return JSON.parse(rawData);
    } catch {
      return { message: rawData };
    }
  }
  return rawData;
};

const formatCoord = (value) => {
  if (!value) return "";
  const [lat, lng] = String(value).split(",").map((part) => parseFloat(part.trim()));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return String(value);
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

const normalizeBookingPayload = (data = {}) => {
  const booking = data.booking && typeof data.booking === "object" ? data.booking : {};
  return {
    ...booking,
    ...data,
    booking,
    booking_id:
      data.booking_id ||
      data.bookingId ||
      data.booking_reference ||
      booking.booking_id ||
      booking.id ||
      data.id,
    pickup_location: data.pickup_location || booking.pickup_location || "",
    destination_location: data.destination_location || booking.destination_location || "",
    pickup_point: data.pickup_point || booking.pickup_point || "",
    destination_point: data.destination_point || booking.destination_point || "",
    booking_date: data.booking_date || booking.booking_date || "",
    pickup_time: data.pickup_time || booking.pickup_time || "",
  };
};

const buildRideDescription = (data) => {
  const normalized = normalizeBookingPayload(data);
  const pickup = normalized.pickup_location || formatCoord(normalized.pickup_point);
  const destination = normalized.destination_location || formatCoord(normalized.destination_point);
  const parts = [];

  if (pickup) parts.push(`Pickup: ${pickup}`);
  if (destination) parts.push(`Destination: ${destination}`);

  return parts.join(" • ") || normalized.message || "New ride request received";
};

const buildBookingMeta = (data) => {
  const normalized = normalizeBookingPayload(data);
  const bookingReference = normalized.booking_reference || normalized.bookingReference;
  if (bookingReference) return `Ref: ${bookingReference}`;

  const bookingId = normalized.booking_id || normalized.bookingId || normalized.booking?.id;
  if (!bookingId) return null;
  return `Booking #${bookingId}`;
};

const buildReminderDescription = (data) => {
  const message = data.description || data.message || data.body;
  if (message) return message;

  const parts = [];
  if (data.pickup_location) parts.push(`Pickup: ${data.pickup_location}`);

  const dateStr = data.booking_date ? formatBookingDate(data.booking_date) : "";
  const timeStr = data.pickup_time ? formatTime(data.pickup_time) : "";
  if (dateStr || timeStr) {
    parts.push(`Scheduled: ${[dateStr, timeStr].filter(Boolean).join(" at ")}`);
  }

  const reminderLabel = formatReminderMinutes(data.reminder_minutes);
  if (reminderLabel) parts.push(reminderLabel);

  return parts.join(" • ") || "Upcoming booking reminder";
};

export const buildNotificationFromSocket = (event, rawData) => {
  const data = parseSocketPayload(rawData);
  if (!data) return null;
  const canonicalEvent = (() => {
    if (["booking-cancelled-event", "booking-cancelled", "cancel-booking-event"].includes(event)) {
      return "booking-cancelled";
    }
    if (["notification-ride", "new-booking-event"].includes(event)) {
      return "ride-request";
    }
    if (["plot-dispatch-failed", "nearest-dispatch-failed", "auto-dispatch-failed"].includes(event)) {
      return "dispatch-failed";
    }
    return event;
  })();
  const booking = normalizeBookingPayload(data);
  const notificationBookingId =
    booking.booking_id ||
    booking.bookingId ||
    booking.booking_reference ||
    booking.id ||
    null;
  const status = booking.booking_status || booking.status || event;

  const base = {
    type: canonicalEvent,
    meta: buildBookingMeta(booking),
    id: notificationBookingId ? `${booking.database || "tenant"}:${canonicalEvent}:${status}:${notificationBookingId}` : undefined,
    dedupeKey: notificationBookingId ? `${booking.database || "tenant"}:${canonicalEvent}:${status}:${notificationBookingId}` : undefined,
  };

  switch (event) {
    case "send-reminder":
      return {
        ...base,
        title: data.title || "Booking Reminder",
        description: buildReminderDescription(data),
        meta: buildBookingMeta(data),
        bookingId: data.booking_id || data.bookingId || null,
        bookingReference: data.booking_reference || data.bookingReference || null,
        pickupLocation: data.pickup_location || null,
        pickupTime: data.pickup_time || null,
        bookingDate: data.booking_date || null,
        reminderMinutes: data.reminder_minutes ?? null,
      };

    case "notification-ride":
      return {
        ...base,
        title: "Ride Request",
        description: buildRideDescription(booking),
      };

    case "nearest-dispatch-failed":
      return {
        ...base,
        title: "Dispatch Failed",
        description: sanitizeNearestDispatchMessage(
          data.message ||
          data.reason ||
          data.failure_reason ||
          NEAREST_DISPATCH_FAILURE_FALLBACK
        ),
      };

    case "plot-dispatch-failed":
      return {
        ...base,
        title: "Dispatch Failed",
        description: sanitizePlotDispatchMessage(
          data.message ||
          data.reason ||
          data.failure_reason
        ),
      };

    case "new-booking-event": {
      const booking = data.booking || data;
      return {
        ...base,
        type: canonicalEvent,
        title: "New Booking",
        description:
          booking.message ||
          buildRideDescription(booking) ||
          "A new booking has been created.",
        meta: buildBookingMeta(booking),
      };
    }

    case "driver-assignment-pending":
      return {
        ...base,
        title: "Driver Assignment Pending",
        description:
          data.message ||
          "A driver assignment is waiting for confirmation.",
      };

    case "job-accepted-by-driver":
      return {
        ...base,
        title: "Ride Accepted",
        description:
          data.message ||
          `${data.driver_name || "Driver"} accepted the job.`,
      };

    case "job-rejected-by-driver":
      return {
        ...base,
        title: "Job Rejected",
        description:
          data.message ||
          `${data.driver_name || "Driver"} rejected the job.`,
      };

    case "auto-dispatch-failed":
      return {
        ...base,
        title: "Auto Dispatch Failed",
        description:
          data.message ||
          "Ride not selected during auto dispatch. Please book manually.",
      };

    case "booking-cancelled-event":
    case "booking-cancelled":
    case "cancel-booking-event":
      return {
        ...base,
        title: "Ride Cancelled",
        description: data.message || "Booking has been cancelled.",
      };

    case "booking-no-show-event":
      return {
        ...base,
        title: "No Show",
        description: data.message || "Driver marked the customer as no show.",
      };

    case "follow-on-job-linked":
      return {
        ...base,
        title: "Follow-On Job Linked",
        description:
          data.message ||
          `${data.driver_name || "Driver"} linked a follow-on job.`,
        meta: data.job1_id ? `Booking #${data.job1_id}` : base.meta,
      };

    case "follow-on-job-sent-to-driver":
      return {
        ...base,
        title: "Follow-On Job Sent",
        description: data.message || "Follow-on job sent to driver.",
      };

    case "follow-on-job-timeout":
      return {
        ...base,
        title: "Follow-On Job Timeout",
        description: data.message || "Follow-on job request timed out.",
      };

    case "follow-on-job-removed":
      return {
        ...base,
        title: "Follow-On Job Removed",
        description: data.message || "Follow-on job was removed.",
      };

    case "send-notification":
    case "general-notification":
    case "dispatcher-notification":
      return {
        ...base,
        title: data.title || "Notification",
        description: data.body || data.message || data.description || "",
      };

    default:
      return null;
  }
};

export const NAVBAR_SOCKET_EVENTS = [
  "send-reminder",
  "notification-ride",
  "nearest-dispatch-failed",
  "plot-dispatch-failed",
  "new-booking-event",
  "driver-assignment-pending",
  "job-accepted-by-driver",
  "job-rejected-by-driver",
  "auto-dispatch-failed",
  "booking-cancelled-event",
  "booking-cancelled",
  "cancel-booking-event",
  "booking-no-show-event",
  "follow-on-job-linked",
  "follow-on-job-sent-to-driver",
  "follow-on-job-timeout",
  "follow-on-job-removed",
  "send-notification",
  "general-notification",
  "dispatcher-notification",
];
