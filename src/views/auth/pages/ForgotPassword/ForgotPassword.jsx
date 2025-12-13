import React from "react";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import ForgotPasswordForm from "./components/ForgotPasswordForm/ForgotPasswordForm";

const ForgotPassword = () => {
  return (
    <AuthLayout title="Forgot Password">
      <ForgotPasswordForm />
    </AuthLayout>
  );
};

export default ForgotPassword;
