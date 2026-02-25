import { ErrorMessage, Field, Form, Formik } from "formik";
import React, { useState } from "react";
import * as Yup from "yup";
import Button from "../../../../../../components/ui/Button/Button";
import FormLabel from "../../../../../../components/ui/FormLabel";
import { apiForgotPassword } from "../../../../../../services/AuthService";
import toast from 'react-hot-toast';

const FORGOT_PASSWORD_VALIDATION_SCHEMA = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
});

const ForgotPasswordForm = () => {
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (values, { setSubmitting, resetForm }) => {
    setLoading(true);
    try {
      const response = await apiForgotPassword(values);

      // Success handling
      if (response.status === 200 || response.data.success) {
        toast.success(response.data.message || "Password reset link sent to your email!");
        resetForm();
      }
    } catch (error) {
      // Error handling
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to send password reset email. Please try again.";

      toast.error(errorMessage);
      console.error("Forgot Password Error:", error);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={{
        email: "",
      }}
      validationSchema={FORGOT_PASSWORD_VALIDATION_SCHEMA}
      onSubmit={handleForgotPassword}
    >
      {({ isSubmitting }) => (
        <Form>
          <div className="flex flex-col gap-[15px]">
            <div>
              <FormLabel htmlFor="email" className="text-[#363636]">
                Email
              </FormLabel>
              <div>
                <div>
                  <Field
                    name="email"
                    type="email"
                    className="border-[1.2px] border-[#E0E0E0] focus:outline-none h-[56px] rounded-lg p-4 text-[18px] font-semibold leading-6 w-full placeholder:text-[#9C9C9C]"
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                </div>
                <ErrorMessage
                  name="email"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>
            </div>
          </div>

          <div className="pt-5">
            <Button
              btnType="submit"
              type="filled"
              className="py-4 w-full rounded-lg text-[18px] leading-6 capitalize"
              disabled={isSubmitting || loading}
            >
              <span>
                {loading ? "Sending..." : "Forgot Password"}
              </span>
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default ForgotPasswordForm;