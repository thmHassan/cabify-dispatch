import { lazy } from "react";
import * as KEY from "../../../constants/routes.key.constant/auth.route.key.constant";
import * as PATH from "../../../constants/routes.path.constant/auth.route.path.constant";

const authRoute = [
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
];

export default authRoute;
