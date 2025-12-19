// api for dashboard
export const GET_DASHBOARD_DETAILS = "/super-admin/dashboard";

// api for company
export const GET_COMPANY_CARD_DETAILS = "/super-admin/company-cards";
export const GET_COMPANY_BY_ID = "/super-admin/edit-company";
export const EDIT_COMPANY = "/super-admin/edit-company";

//api for booking
export const GET_ALL_PLOT = "/company/get-plot"
export const CREATE_BOOKING = "/company/create-booking"
export const CALCULATE_FARES = "/company/calculate-fares"
export const CANCELLED_BOOKING = "/company/cancelled-booking"

//api for dispatcher
export const CREATE_DISPATCHER = "/company/create-dispatcher";
export const DELETE_DISPATCHER = "/company/delete-dispatcher";
export const EDIT_DISPATCHER = "/company/edit-dispatcher";

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

// api for driver's documents
export const GET_DRIVERS_DOCUMENT = "/company/list-document-type";
export const CREATE_DRIVERS_DOCUMENT = "/company/create-document-type";
export const DELETE_DRIVERS_DOCUMENT = "/company/delete-document-type";
export const EDIT_DRIVERS_DOCUMENT = "/company/edit-document-type";
export const GET_DRIVERS_DOCUMENT_BY_ID = "/company/edit-document-type";

// api for Reviews
export const GET_CUSTOMER_RATINGS = "/company/customer-ratings"
export const GET_DRIVER_RATING = "/company/driver-ratings"

// api for Rides Management
export const GET_RIDE_MANAGEMENT = "/company/booking-list"

// api for plots
export const GET_PLOTS = "/company/list-plot";
export const CREATE_PLOT = "/company/create-plot";
export const EDIT_PLOT = "/company/edit-plot";
export const DELETE_PLOT = "/company/delete-plot";
export const GET_PLOT_BY_ID = "/company/edit-plot";
export const MANAGE_PLOT = "/company/all-plot"
export const ASSIGN_BACKUP_PLOT = "/company/store-backup-plot"
export const GET_BACKUP_PLOT = "/company/get-backup-plot"

// api for sub company
export const GET_SUB_COMPANY_LIST = "/company/list-sub-company";
export const GET_SUB_COMPANY_BY_ID = "/company/edit-sub-company";
export const CREATE_SUB_COMPANY = "/company/create-sub-company";
export const EDIT_SUB_COMPANY = "/company/edit-sub-company";
export const DELETE_SUB_COMPANY = "/company/delete-sub-company";

// api for vehicle types
export const GET_VEHICLE_TYPES = "/company/list-vehicle-type";
export const GET_VEHICLE_TYPE_BY_ID = "/company/edit-vehicle-type";
export const CREATE_VEHICLE_TYPE = "/company/create-vehicle-type";
export const EDIT_VEHICLE_TYPE = "/company/edit-vehicle-type";
export const DELETE_VEHICLE_TYPE = "/company/delete-vehicle-type";
export const ALL_VEHICLE_TYPE = "/company/all-vehicle-type"

// api for settings configuration
export const GET_COMPANY_PROFILE = "/company/get-company-profile";
export const SAVE_COMPANY_PROFILE = "/company/save-company-profile";
export const UPDATE_PASWORD = "/company/update-password"
export const GET_MOBILE_APP_SETTINGS = "/company/get-mobile-setting";
export const SAVE_MOBILE_APP_SETTINGS = "/company/update-mobile-setting";
export const GET_COMMISSION = "/company/get-commission-data";
export const SAVE_COMMISSION = "/company/save-main-commission";
export const CREATE_PACKAGE_TOPUP = "/company/save-package-topup";
export const EDIT_PACKAGE_TOPUP = "/company/edit-package-topup";
export const DELETE_PACKAGE_TOPUPS = "/company/delete-package-topup";
export const GATE_PLAN_DETAILS = "/company/plan-detail"
export const SAVE_STRIPE_INFORMATION = "/company/stripe-information"
export const GATE_STRIPE_INFORMATION = "/company/stripe-information"
export const GATE_INVOICE_HISTORY = "/company/payment-history"
export const GET_THIRD_PARTY_INFORMATION = "/company/third-party-information"
export const SAVE_THIRD_PARTY_INFORMATION = "/company/third-party-information"

//api for account
export const GET_ACCOUNT= "/company/list-account";
export const UPDATE_ACCOUNT = "/company/edit-account";
export const CREATE_ACCOUNT= "/company/create-account";
export const DELETE_ACCOUNT = "/company/delete-account";
export const GET_ACCOUNT_BY_ID = "/company/edit-account";

// api for tickets
export const GET_TICKETS = "/company/list-ticket";
export const CHANGE_TICKET_STATUS = "/company/change-ticket-status";
export const REPLY_TICKET = "/company/reply-ticket";

//api for Lost and Found
export const GET_LOST_FOUND_LIST = "/company/list-lost-found"
export const CHANGE_STATUS_LOST_FOUND = "/company/change-status-lost-found"

// api for subscriptions
export const CREATE_SUBSCRIPTION = "/super-admin/create-subscription";
export const GET_SUBSCRIPTION_BY_ID = "/super-admin/edit-subscription";
export const EDIT_SUBSCRIPTION = "/super-admin/edit-subscription";
export const GET_SUBSCRIPTIONS = "/super-admin/subscription-list";
export const GET_SUBSCRIPTION_CARDS = "/super-admin/subscription-cards";

// api for usage monitoring
export const GET_USAGE_MONITORING = "/super-admin/usage-monitoring";

// api for account
export const CHANGE_PASSWORD = "/super-admin/change-password";
export const UPDATE_PROFILE = "/super-admin/update-profile";

//api for General Notification
export const SEND_NOTIFICATION = "/company/send-notification"