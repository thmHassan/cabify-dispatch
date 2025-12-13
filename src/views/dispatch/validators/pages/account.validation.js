import * as Yup from "yup";

export const PROFILE_SCHEMA = Yup.object().shape({
  name: Yup.string().trim().required("Name is required"),
  email: Yup.string()
    .trim()
    .email("Enter a valid email")
    .required("Email is required"),
});

export const CHANGE_PASSWORD_SCHEMA = Yup.object().shape({
  old_password: Yup.string().required("Old password is required"),
  new_password: Yup.string()
    .min(6, "New password must be at least 6 characters")
    .required("New password is required"),
});
