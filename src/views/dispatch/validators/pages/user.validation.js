import * as Yup from "yup";

export const USER_VALIDATION_SCHEMA = Yup.object().shape({
    name: Yup.string().required("Name is required").min(2),
    email: Yup.string().email("Invalid email").required("Email is required"),
    phoneNumber: Yup.string().required("Phone number is required"),
    password: Yup.string().when("isEditMode", {
        is: false,
        then: schema => schema.required("Password is required").min(6),
        otherwise: schema => schema.notRequired(),
    }),
    address: Yup.string(),
    city: Yup.string(),
});