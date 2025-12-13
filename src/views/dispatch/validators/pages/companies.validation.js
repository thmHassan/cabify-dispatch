import * as Yup from "yup";

// Basic Information Validation Schema
export const BASIC_INFORMATION_VALIDATION_SCHEMA = {
  company_name: Yup.string()
    .required("Company name is required")
    .min(2, "Company name must be at least 2 characters"),
  company_admin_name: Yup.string()
    .required("Company admin name is required")
    .min(2, "Admin name must be at least 2 characters"),
  user_name: Yup.string()
    .required("Username is required")
    .min(3, "Username must be at least 3 characters"),
  password: Yup.string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
  company_id: Yup.string()
    .required("Company ID is required")
    .min(2, "Company ID must be at least 2 characters"),
  contact_person: Yup.string()
    .required("Contact person is required")
    .min(2, "Contact person name must be at least 2 characters"),
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  phone: Yup.string()
    .required("Phone number is required")
    .matches(/^[0-9+\-\s()]+$/, "Invalid phone number format")
    .min(10, "Phone number must be at least 10 digits"),
  address: Yup.string()
    .required("Address is required")
    .min(5, "Address must be at least 5 characters"),
  city: Yup.string()
    .required("City is required")
    .min(2, "City must be at least 2 characters"),
  currency: Yup.string().required("Currency is required"),
};

// Services Information Validation Schema
export const SERVICE_INFORMATION_VALIDATION_SCHEMA = {
  maps_api: Yup.string().required("Maps API is required"),
  search_api: Yup.string().required("Search API is required"),
  passengers_allowed: Yup.number()
    .required("Passengers allowed is required")
    .min(1, "Must allow at least 1 passenger")
    .integer("Must be a whole number"),
  dispatchers_allowed: Yup.number()
    .required("Dispatchers allowed is required")
    .min(1, "Must allow at least 1 dispatcher")
    .integer("Must be a whole number"),
  drivers_allowed: Yup.number()
    .required("Drivers allowed is required")
    .min(1, "Must allow at least 1 driver")
    .integer("Must be a whole number"),
  subscription_type: Yup.string().required("Subscription type is required"),
  log_map_search_result: Yup.boolean(),
  voip: Yup.boolean(),
  sub_company: Yup.boolean(),
  uber_plot_hybrid: Yup.string().required("System type is required"),
  fleet_management: Yup.string().required(
    "Fleet management option is required"
  ),
  sos_features: Yup.string().required("SOS features option is required"),
  notes: Yup.string().nullable(),
};

// System Information Validation Schema
export const SYSTEM_INFORMATION_VALIDATION_SCHEMA = {
  units: Yup.string().required("Units is required"),
  country_of_use: Yup.string().required("Country of use is required"),
  time_zone: Yup.string().required("Time zone is required"),
  stripe_enable: Yup.boolean(),
  enable_smtp: Yup.boolean(),
  stripe_enablement: Yup.string().when("stripe_enable", {
    is: true,
    then: (schema) =>
      schema.required("Stripe enablement is required when Stripe is enabled"),
    otherwise: (schema) => schema.nullable(),
  }),
};

// Enablement Information Validation Schema
export const ENABLEMENT_INFORMATION_VALIDATION_SCHEMA = {
  dispatcher: Yup.boolean(),
  map: Yup.boolean(),
  push_notification: Yup.boolean(),
  usage_monitoring: Yup.boolean(),
  revenue_statements: Yup.boolean(),
  zone: Yup.boolean(),
  manage_zones: Yup.boolean(),
  cms: Yup.boolean(),
  lost_found: Yup.boolean(),
  accounts: Yup.boolean(),
};

export const COMPANY_VALIDATION_SCHEMA = Yup.object().shape({
  ...BASIC_INFORMATION_VALIDATION_SCHEMA,
  ...SERVICE_INFORMATION_VALIDATION_SCHEMA,
  ...SYSTEM_INFORMATION_VALIDATION_SCHEMA,
  ...ENABLEMENT_INFORMATION_VALIDATION_SCHEMA,
});

export const COMPANY_SETTING_VALIDATION_SCHEMA = Yup.object().shape({
  mapApiProvider: Yup.string().trim().required("Map API provider is required"),
  callApiProvider: Yup.string()
    .trim()
    .required("Call API provider is required"),
  paymentMethod: Yup.string().trim().required("Payment method is required"),
  planType: Yup.string().trim().required("Plan type is required"),
  mapSearchApiProvider: Yup.string()
    .trim()
    .required("Map search API provider is required"),
});
