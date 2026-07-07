import * as Yup from "yup";

const INDIVIDUAL_RECIPIENT_TYPES = ["individual_drivers", "individual_users"];

const resolveRecipientType = (type) => type?.value || type || "";

export const NOTIFICATION_VALIDATION_SCHEMA = Yup.object().shape({
    title: Yup.string().required("Title is required"),
    body: Yup.string().required("Body is required"),
    type: Yup.mixed().required("Recipient type is required"),
    recipients: Yup.array().when("type", {
        is: (type) => INDIVIDUAL_RECIPIENT_TYPES.includes(resolveRecipientType(type)),
        then: (schema) =>
            schema
                .min(1, "Select at least one recipient")
                .required("Select at least one recipient"),
        otherwise: (schema) => schema,
    }),
    vehicleType: Yup.mixed().nullable(),
});
