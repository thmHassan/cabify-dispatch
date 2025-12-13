import React from "react";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import ResetPasswordForm from "./components/ResetPasswordForm";

const ResetPassword = () => {
  return (
    <AuthLayout title="Reset Password">
      <ResetPasswordForm />
    </AuthLayout>
  );
};

export default ResetPassword;
