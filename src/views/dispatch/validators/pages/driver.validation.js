import * as Yup from "yup";

export const DRIVER_DOCUMENT_VALIDATION_SCHEMA = Yup.object().shape({
  documentName: Yup.string().trim().required("Document name is required"),
  frontPhoto: Yup.boolean().optional(),
  backPhoto: Yup.boolean().optional(),
  issuePhoto: Yup.boolean().optional(),
  issueDate: Yup.boolean().optional(),
  expiryDate: Yup.boolean().optional(),
  numberField: Yup.boolean().optional(),
  at_least_one: Yup.boolean().test(
    "at-least-one-document-flag",
    "Select at least one document option",
    function () {
      const p = this.parent || {};
      return !!(
        p.frontPhoto ||
        p.backPhoto ||
        p.issuePhoto ||
        p.issueDate ||
        p.expiryDate ||
        p.numberField
      );
    }
  ),
});
