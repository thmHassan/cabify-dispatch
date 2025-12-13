import * as Yup from "yup";

export const SUBSCRIPTION_VALIDATION_SCHEMA = Yup.object().shape({
  plan_name: Yup.string().trim().required("Plan is required"),
  billing_cycle: Yup.string().trim().required("Billing cycle is required"),
  amount: Yup.number()
    .typeError("Amount must be a number")
    .positive("Amount must be greater than 0")
    .required("Amount is required"),
  features: Yup.array()
    .of(Yup.string().trim())
    .min(1, "Select at least one feature"),
});
