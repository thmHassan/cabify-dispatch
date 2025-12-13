import React from "react";
import SigninForm from "./components/SigninForm";
import AuthLayout from "../../components/AuthLayout";
import SigninFormFields from "./components/SigninFormFields";

const SignIn = () => {
  const initialValues = {
    email: "divonyx@gmail.com",
    password: "divonyx@123",
  };

  return (
    <AuthLayout title="Client Admin Panel Login">
      <SigninForm initialValues={initialValues} isAdminLogin={true}>
        <SigninFormFields />
      </SigninForm>
    </AuthLayout>
  );
};

export default SignIn;
