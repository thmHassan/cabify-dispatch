import React from "react";
import SigninForm from "./components/SigninForm";
import AuthLayout from "../../components/AuthLayout";
import SigninFormFields from "./components/SigninFormFields";

const SignIn = () => {
  const initialValues = {
    company_id: "divonyx245",
    email: "dispatcher@gmail.com",
    password: "dispatcher@123",
  };

  return (
    <AuthLayout title="Dispatch Admin Panel Login">
      <SigninForm initialValues={initialValues} isAdminLogin={true}>
        <SigninFormFields />
      </SigninForm>
    </AuthLayout>
  );
};

export default SignIn;
