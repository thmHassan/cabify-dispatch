//api for booking
export const GET_ALL_PLOT = "/company/get-plot"
export const CREATE_BOOKING = "/company/create-booking"
export const CALCULATE_FARES = "/company/calculate-fares"
export const CANCELLED_BOOKING = "/company/cancelled-booking"

// api for user
export const CREATE_USER = "/company/create-user";
export const GET_USER_LIST = "/company/list-user";
export const GET_USER_BY_ID = "/company/edit-user";
export const POST_EDIT_USER_STATUS = "/company/change-user-status";
export const EDIT_USER = "/company/edit-user";
export const DELETE_USER = "/company/delete-user";  
export const RIDE_HISTORY = "/company/ride-history"

//api for drivers management
export const GET_DRIVERS_MANAGEMENT = "/company/list-driver";
export const GET_DRIVER_BY_ID = "/company/edit-driver";
export const CREATE_DRIVER = "/company/create-driver";
export const EDIT_DRIVER = "/company/edit-driver";
export const DELETE_DRIVER = "/company/delete-driver";
export const POST_EDIT_DRIVER_STATUS = "/company/change-driver-status";
export const ADD_WALLET_BALANCE = "/company/add-wallet-balance"
export const DRIVER_DOCUMENT_LIST = "/company/driver-document-list"
export const GET_BY_ID_DRIVER_DOCUMENT = "/company/driver-document"
export const CHANGE_DRIVER_DOCUMENT_STATUS = "/company/change-status-document"
export const DELETE_DRIVER_DOCUMENT = "/company/delete-driver-document"
export const APPROVE_VEHICLE  = "/company/approv-vehicle-details"
export const REJECT_VAHICLE = "/company/reject-vehicle-details"
export const DRIVER_RIDE_HISTORY = "/company/driver-ride-history"
export const SEND_DRIVER_NOTIFICATION = "/company/send-driver-notification"

// api for Rides Management
export const GET_RIDE_MANAGEMENT = "/company/booking-list"

// api for sub company
export const GET_SUB_COMPANY_LIST = "/company/list-sub-company";

// api for vehicle types
export const ALL_VEHICLE_TYPE = "/company/all-vehicle-type"

//api for account
export const GET_ACCOUNT= "/company/list-account";

// api for tickets
export const GET_TICKETS = "/company/list-ticket";
export const CHANGE_TICKET_STATUS = "/company/change-ticket-status";
export const REPLY_TICKET = "/company/reply-ticket";

//api for Lost and Found
export const GET_LOST_FOUND_LIST = "/company/list-lost-found"
export const CHANGE_STATUS_LOST_FOUND = "/company/change-status-lost-found"

//api for General Notification
export const SEND_NOTIFICATION = "/company/send-notification"

export const GATE_DISPATCH_SYSTEM = "/company/get-dispatch-system"
