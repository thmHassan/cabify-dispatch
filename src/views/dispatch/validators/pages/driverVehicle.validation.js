import * as Yup from "yup";

const numberRequired = (label) =>
  Yup.number()
    .typeError(`${label} must be a number`)
    .min(0, `${label} must be greater than or equal to 0`)
    .required(`${label} is required`);

export const DRIVER_VEHICLE_VALIDATION_SCHEMA = Yup.object().shape({
  vehicle_type_name: Yup.string()
    .trim()
    .required("Vehicle type name is required"),
  order_no: Yup.mixed().required("Order no is required"),
  vehicle_type_service: Yup.string()
    .trim()
    .required("Vehicle type service is required"),
  minimum_price: numberRequired("Minimum price"),
  minimum_distance: numberRequired("Minimum distance"),
  vehicle_image: Yup.mixed().required("Vehicle image is required"),
  backup_bid_vehicle_type: Yup.array()
    .of(Yup.string())
    .optional(),

  base_fare_system_status: Yup.boolean().optional(),
  base_fare_less_than_x_miles: numberRequired("Base fare less than miles"),
  base_fare_less_than_x_price: numberRequired(
    "Base fare less than miles price"
  ),
  base_fare_from_x_miles: numberRequired("Base fare from miles"),
  base_fare_to_x_miles: numberRequired("Base fare to miles"),
  base_fare_from_to_price: numberRequired("Base fare range price"),
  base_fare_greater_than_x_miles: numberRequired(
    "Base fare greater than miles"
  ),
  base_fare_greater_than_x_price: numberRequired(
    "Base fare greater than miles price"
  ),

  mileage_system: Yup.string()
    .oneOf(["fixed", "dynamic"])
    .required("Select mileage system"),
  first_mile_km: Yup.number()
    .typeError("First mile/km must be a number")
    .min(0, "First mile/km must be >= 0")
    .when("mileage_system", {
      is: "fixed",
      then: (schema) => schema.required("First mile/km is required"),
      otherwise: (schema) => schema.optional(),
    }),
  second_mile_km: Yup.number()
    .typeError("Second mile/km must be a number")
    .min(0, "Second mile/km must be >= 0")
    .when("mileage_system", {
      is: "fixed",
      then: (schema) => schema.required("Second mile/km is required"),
      otherwise: (schema) => schema.optional(),
    }),

  from: Yup.number()
    .typeError("From must be a number")
    .min(0, "From must be >= 0")
    .when(["mileage_system", "from_array"], {
      is: (mileage_system, from_array) => 
        mileage_system === "dynamic" && (!from_array || from_array.length === 0),
      then: (schema) => schema.required("From is required"),
      otherwise: (schema) => schema.optional(),
    }),
  to: Yup.number()
    .typeError("To must be a number")
    .min(0, "To must be >= 0")
    .when(["mileage_system", "from_array"], {
      is: (mileage_system, from_array) => 
        mileage_system === "dynamic" && (!from_array || from_array.length === 0),
      then: (schema) => schema.required("To is required"),
      otherwise: (schema) => schema.optional(),
    }),
  price: Yup.number()
    .typeError("Fare must be a number")
    .min(0, "Fare must be >= 0")
    .when(["mileage_system", "from_array"], {
      is: (mileage_system, from_array) => 
        mileage_system === "dynamic" && (!from_array || from_array.length === 0),
      then: (schema) => schema.required("Fare is required"),
      otherwise: (schema) => schema.optional(),
    }),
  from_array: Yup.array()
    .of(
      Yup.number()
        .typeError("From must be a number")
        .min(0, "From must be >= 0")
        .required("From is required")
    )
    .when("mileage_system", {
      is: "dynamic",
      then: (schema) =>
        schema
          .min(1, "At least one range entry is required")
          .required("At least one range entry is required"),
      otherwise: (schema) => schema.optional(),
    }),
  to_array: Yup.array()
    .of(
      Yup.number()
        .typeError("To must be a number")
        .min(0, "To must be >= 0")
        .required("To is required")
    )
    .when("mileage_system", {
      is: "dynamic",
      then: (schema) =>
        schema
          .min(1, "At least one range entry is required")
          .required("At least one range entry is required"),
      otherwise: (schema) => schema.optional(),
    }),
  price_array: Yup.array()
    .of(
      Yup.number()
        .typeError("Fare must be a number")
        .min(0, "Fare must be >= 0")
        .required("Fare is required")
    )
    .when("mileage_system", {
      is: "dynamic",
      then: (schema) =>
        schema
          .min(1, "At least one range entry is required")
          .required("At least one range entry is required"),
      otherwise: (schema) => schema.optional(),
    }),

  attribute_array: Yup.object()
    .test(
      "at-least-one",
      "At least one attribute is required",
      function (value) {
        if (!value || typeof value !== "object") {
          return false;
        }
        const keys = Object.keys(value);
        return keys.length > 0;
      }
    )
    .required("At least one attribute is required"),
});
