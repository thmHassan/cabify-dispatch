// api for dashboard
export const GET_DASHBOARD_DETAILS = "/super-admin/dashboard";

// api for user
export const CREATE_USER = "/company/create-user";
export const GET_USER_LIST = "/company/list-user";
export const GET_USER_BY_ID = "/company/edit-user";
export const POST_EDIT_USER_STATUS = "/company/change-user-status";
export const EDIT_USER = "/company/edit-user";
export const DELETE_USER = "/company/delete-user";

//api for drivers management
export const GET_DRIVERS_MANAGEMENT = "/company/list-driver";
export const GET_DRIVER_BY_ID = "/company/edit-driver";
export const CREATE_DRIVER = "/company/create-driver";
export const EDIT_DRIVER = "/company/edit-driver";
export const DELETE_DRIVER = "/company/delete-driver";
export const POST_EDIT_DRIVER_STATUS = "/company/change-driver-status";

// api for Rides Management
export const GET_RIDE_MANAGEMENT = "/company/booking-list"

// api for tickets
export const GET_TICKETS = "/company/list-ticket";
export const CHANGE_TICKET_STATUS = "/company/change-ticket-status";
export const REPLY_TICKET = "/company/reply-ticket";

//api for Lost and Found
export const GET_LOST_FOUND_LIST = "/company/list-lost-found"
export const CHANGE_STATUS_LOST_FOUND = "/company/change-status-lost-found"
