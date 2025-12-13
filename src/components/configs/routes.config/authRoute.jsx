import { lazy } from "react";
import * as KEY from "../../../constants/routes.key.constant/auth.route.key.constant";
import * as PATH from "../../../constants/routes.path.constant/auth.route.path.constant";

const authRoute = [
  // {
  //   key: KEY.USER_SELECTION_KEY,
  //   path: PATH.SELECTION_PATH,
  //   component: lazy(() => import("../../templates/UserSelection")),
  //   authority: [],
  // },
  // {
  //   key: KEY.CLIENT_SIGN_IN_KEY,
  //   path: PATH.CLIENT_SIGN_IN_PATH,
  //   component: lazy(
  //     () => import("../../../views/auth/pages/SignIn/components/ClientSignIn")
  //   ),
  //   authority: [],
  // },
  // {
  //   key: KEY.DISPATCHER_SIGN_IN_KEY,
  //   path: PATH.DISPATCHER_SIGN_IN_PATH,
  //   component: lazy(
  //     () =>
  //       import("../../../views/auth/pages/SignIn/components/DispatcherSignIn")
  //   ),
  //   authority: [],
  // },
  {
    key: KEY.SIGN_IN_KEY,
    path: PATH.SIGN_IN_PATH,
    component: lazy(() => import("../../../views/auth/pages/SignIn")),
    authority: [],
  },
  {
    key: KEY.SIGN_UP_KEY,
    path: PATH.SIGN_UP_PATH,
    component: lazy(() => import("../../../views/auth/pages/SignUp")),
    authority: [],
  },
  {
    key: KEY.FORGOT_PASSWORD_KEY,
    path: PATH.FORGOT_PASSWORD_PATH,
    component: lazy(() => import("../../../views/auth/pages/ForgotPassword")),
    authority: [],
  },
  {
    key: KEY.RESET_PASSWORD_KEY,
    path: PATH.RESET_PASSWORD_PATH,
    component: lazy(() => import("../../../views/auth/pages/ResetPassword")),
    authority: [],
  },
  // {
  //   key: KEY.VERIFY_IDENTITY_KEY,
  //   path: PATH.VERIFY_IDENTITY_PATH,
  //   component: lazy(() =>
  //     import("../../../views/auth/pages/ForgotPassword/pages/VerifyIdentity")
  //   ),
  //   authority: [],
  // },
  // {
  //   key: KEY.OTP_VERIFIER,
  //   path: PATH.OTP_VERIFIER,
  //   component: lazy(() =>
  //     import("../../../views/auth/pages/ForgotPassword/pages/OtpVerifier")
  //   ),
  //   authority: [],
  // },
];

export default authRoute;
