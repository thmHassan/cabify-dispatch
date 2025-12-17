import React, { useState } from "react";
import useAuth from "../../../../../../utils/hooks/useAuth";
import useApiLoader from "../../../../../../utils/hooks/useApiLoader";
import { ErrorMessage, Field, Form, Formik } from "formik";
import Password from "../../../../../../components/elements/CustomPassword/Password";
import Button from "../../../../../../components/ui/Button/Button";
import PageSubTitle from "../../../../../../components/ui/PageSubTitle";
import { useNavigate } from "react-router-dom";
import { FORGOT_PASSWORD_PATH } from "../../../../../../constants/routes.path.constant/auth.route.path.constant";
import Loading from "../../../../../../components/shared/Loading/Loading";
import AppLogoLoader from "../../../../../../components/shared/AppLogoLoader";

const SigninForm = ({
  disableSubmit,
  children,
  initialValues = {},
  isAdminLogin = false,
}) => {
  const { signIn, adminSignIn } = useAuth();
  const navigate = useNavigate();
  const { isLoading, executeWithLoader } = useApiLoader();
  const [toastMessage, setToastMessage] = useState("");

  const onSignIn = async (values, setSubmitting) => {
    const { email, password, company_id } = values;

    setSubmitting(true);

    try {
      await executeWithLoader(
        () =>
          isAdminLogin
            ? adminSignIn({ email, password, company_id })
            : signIn({ email, password }),
        {
          onSuccess: (result) => {
            if (result?.status === "failed") {
              setToastMessage(result.message || "Login failed");
            } else {
              // clear any previous error toast
              setToastMessage("");
            }
          },
          onError: (error) => {
            console.error("Login error:", error);
            const msg =
              error?.response?.data?.message ||
              error?.message ||
              "Login failed";
            setToastMessage(msg);
          },
        }
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Loading
      loading={isLoading}
      type="fullscreen"
      customLoader={<AppLogoLoader />}
    >
      <Formik
        initialValues={initialValues}
        //   validationSchema={SIGNIN_VALIDATION_SCHEMA}
        onSubmit={(values, { setSubmitting }) => {
          if (!disableSubmit) {
            // Clear previous toast before new attempt
            setToastMessage("");
            onSignIn(values, setSubmitting);
          } else {
            setSubmitting(false);
          }
        }}
      >
        {() => (
          <>
            <Form>
              <div className="flex flex-col gap-3 sm:gap-[14px] md:gap-4 lg:gap-[14px] xl:gap-[15px]">
                {children}
              </div>
              <div className="pt-2 sm:pt-[10px] md:pt-3 pb-4 sm:pb-[18px] md:pb-5">
                <Button onClick={() => navigate(FORGOT_PASSWORD_PATH)}>
                  <PageSubTitle
                    title="Forgot Password?"
                    className="!text-[#1F41BB] underline underline-offset-2"
                  />
                </Button>
              </div>
              <div>
                <Button
                  btnType="submit"
                  type="filled"
                  className="py-3 sm:py-[14px] md:py-3.5 lg:py-[14px] xl:py-4 w-full rounded-lg text-base sm:text-[17px] md:text-lg lg:text-[17px] xl:text-[18px] leading-5 sm:leading-[22px] md:leading-6 capitalize"
                  disabled={isLoading}
                >
                  <span>{isLoading ? "Logging in..." : "login"}</span>
                </Button>
              </div>
            </Form>

            {toastMessage && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 text-sm sm:text-base">
                {toastMessage}
              </div>
            )}
          </>
        )}
      </Formik>
    </Loading>
  );
};

export default SigninForm;
