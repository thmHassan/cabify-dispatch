import { ErrorMessage, Field, Form, Formik } from "formik";
import React from "react";
import Button from "../../../../../../components/ui/Button/Button";
import FormLabel from "../../../../../../components/ui/FormLabel";

const ForgotPasswordForm = () => {
  return (
    <Formik
      initialValues={{}}
      //   validationSchema={SIGNIN_VALIDATION_SCHEMA}
      //   onSubmit={(values, { setSubmitting }) => {
      //     if (!disableSubmit) {
      //       onSignIn(values, setSubmitting);
      //     } else {
      //       setSubmitting(false);
      //     }
      //   }}
    >
      {() => (
        <Form>
          <div className="flex flex-col gap-[15px]">
            <div>
              <FormLabel htmlFor="Email" className="text-[#363636]">
                Email
              </FormLabel>
              <div>
                <div>
                  <Field
                    name="email"
                    type="text"
                    className="border-[1.2px] border-[#E0E0E0] focus:outline-none h-[56px] rounded-lg p-4 text-[18px] font-semibold leading-6 w-full placeholder:text-[#9C9C9C]"
                    placeholder="Enter your email"
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
          </div>
          <div className="pt-5">
            <Button
              btnType="submit"
              type="filled"
              className="py-4 w-full rounded-lg text-[18px] leading-6 capitalize"
            >
              <span>forgot password</span>
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default ForgotPasswordForm;
