import React from "react";
import AuthLayout from "../../../../components/AuthLayout";
import SigninForm from "../SigninForm";
import SigninFormFields from "../SigninFormFields";
import { ErrorMessage, Field } from "formik";
import FormLabel from "../../../../../../components/ui/FormLabel";

const ClientSignIn = () => {
  const initialValues = {
    email: "adminclient@gmail.com",
    password: "Text@123",
  };
  return (
    <AuthLayout title="Client Admin Panel Login">
      <SigninForm initialValues={initialValues}>
        <div>
          <div>
            <div>
              <Field
                name="email"
                type="text"
                className="border-[1.2px] border-[#E0E0E0] focus:outline-none h-[56px] rounded-lg p-4 text-[18px] font-semibold leading-6 w-full placeholder:text-[#9C9C9C]"
                placeholder="Enter Company ID"
                autoComplete="off"
              />
            </div>
            <ErrorMessage
              name="email"
              component="div"
              className="text-red-500 text-sm"
            />
          </div>
        </div>
        <SigninFormFields />
      </SigninForm>
    </AuthLayout>
  );
};

export default ClientSignIn;
