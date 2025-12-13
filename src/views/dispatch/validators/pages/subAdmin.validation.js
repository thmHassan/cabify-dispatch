import * as Yup from "yup";

export const SUB_ADMIN_NEW_VALIDATION_SCHEMA = Yup.object().shape({
  name: Yup.string()
    .trim()
    .min(2, "Name is too short")
    .required("Name is required"),
  email: Yup.string()
    .trim()
    .email("Enter a valid email")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  cPassword: Yup.string()
    .oneOf([Yup.ref("password"), null], "Passwords must match")
    .required("Confirm password is required"),
  permissions: Yup.mixed().test(
    "permissions-not-empty",
    "Select at least one permission",
    (val) =>
      !!val &&
      Object.values(val).some((arr) => Array.isArray(arr) && arr.length > 0)
  ),
});

export const SUB_ADMIN_EDIT_VALIDATION_SCHEMA = Yup.object().shape({
  name: Yup.string()
    .trim()
    .min(2, "Name is too short")
    .required("Name is required"),
  email: Yup.string()
    .trim()
    .email("Enter a valid email")
    .required("Email is required"),
  permissions: Yup.mixed().test(
    "permissions-not-empty",
    "Select at least one permission",
    (val) =>
      !!val &&
      Object.values(val).some((arr) => Array.isArray(arr) && arr.length > 0)
  ),
});
