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

const buildRideDescription = (data) => {
  const pickup = data.pickup_location || formatCoord(data.pickup_point);
  const destination = data.destination_location || formatCoord(data.destination_point);
  const parts = [];

  if (pickup) parts.push(`Pickup: ${pickup}`);
  if (destination) parts.push(`Destination: ${destination}`);

  return parts.join(" • ") || data.message || "New ride request received";
};

const buildBookingMeta = (data) => {
  const bookingId = data.booking_id || data.bookingId || data.booking?.id;
  if (!bookingId) return null;
  return `Booking #${bookingId}`;
};

export const buildNotificationFromSocket = (event, rawData) => {
  const data = parseSocketPayload(rawData);
  if (!data) return null;

  const base = {
    type: event,
    meta: buildBookingMeta(data),
  };

  switch (event) {
    case "send-reminder":
      return {
        ...base,
        title: data.title || "Reminder",
        description: data.description || data.message || data.body || "",
        meta: data.client_id ? `Client: ${data.client_id}` : base.meta,
      };

    case "notification-ride":
      return {
        ...base,
        title: "New Ride Request",
        description: buildRideDescription(data),
      };

    case "nearest-dispatch-failed":
      return {
        ...base,
        title: "Nearest Dispatch Failed",
        description:
          data.message ||
          data.reason ||
          data.failure_reason ||
          "No nearby drivers available within 6km radius.",
      };

    case "new-booking-event": {
      const booking = data.booking || data;
      return {
        ...base,
        type: event,
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
        title: "Job Accepted",
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
        title: "Booking Cancelled",
        description: data.message || "Booking has been cancelled.",
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
  "new-booking-event",
  "driver-assignment-pending",
  "job-accepted-by-driver",
  "job-rejected-by-driver",
  "auto-dispatch-failed",
  "booking-cancelled-event",
  "booking-cancelled",
  "cancel-booking-event",
  "follow-on-job-linked",
  "follow-on-job-sent-to-driver",
  "follow-on-job-timeout",
  "follow-on-job-removed",
  "send-notification",
  "general-notification",
  "dispatcher-notification",
];
