import * as Yup from "yup";

export const ZONES_LOCATION_VALIDATION_SCHEMA = Yup.object().shape({
  name: Yup.string().trim().required("Plot name is required"),
  featureSelected: Yup.boolean().oneOf(
    [true],
    "Please select an area on the map"
  ),
});
