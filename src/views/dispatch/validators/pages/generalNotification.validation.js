import * as Yup from "yup";

export const NOTIFICATION_VALIDATION_SCHEMA = Yup.object().shape({
    title: Yup.string().required("Title is required"),
    body: Yup.string().required("Body is required"),
    type: Yup.mixed().required("User type is required"),
    recipients: Yup.array()
        .min(1, "Select at least one recipient")
        .required("Select at least one recipient"),
    vehicleType: Yup.mixed().nullable(),
});
