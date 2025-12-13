import React from "react";
import AuthLayout from "../../../../components/AuthLayout";
import SigninForm from "../SigninForm";
import SigninFormFields from "../SigninFormFields";

const DispatcherSignIn = () => {
  const initialValues = {
    email: "admindispatcher@gmail.com",
    password: "Text@123",
  };
  return (
    <AuthLayout title="Dispatcher Admin Panel Login">
      <SigninForm initialValues={initialValues}>
        <SigninFormFields />
      </SigninForm>
    </AuthLayout>
  );
};

export default DispatcherSignIn;
