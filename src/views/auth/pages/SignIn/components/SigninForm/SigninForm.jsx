import React, { useEffect, useState } from "react";
import useAuth from "../../../../../../utils/hooks/useAuth";
import useApiLoader from "../../../../../../utils/hooks/useApiLoader";
import { Field, Form, Formik } from "formik";
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

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
            // Handle APIs that return error:1 with 200 HTTP status
            if (result?.status === "failed") {
              setToastMessage(result.message || "Login failed");
            } else {
              setToastMessage("");
            }
          },
          onError: (error) => {
            // useAuth now throws a pre-mapped friendly Error — use error.message directly
            const msg = error?.message || "Login failed. Please try again.";
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
        onSubmit={(values, { setSubmitting }) => {
          if (!disableSubmit) {
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

            {/* Toast — single source, rendered once */}
            {toastMessage && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-[9999] text-sm sm:text-base whitespace-nowrap">
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