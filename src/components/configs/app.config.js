import { SIGN_IN_PATH } from "../../constants/routes.path.constant/auth.route.path.constant";

const appConfig = {
  apiPrefix: "https://backend.cabifyit.com/api",
  authenticatedEntryPath: "/overview",
  unAuthenticatedEntryPath: SIGN_IN_PATH,
  locale: "en",
  enableMock: false,
};

export default appConfig;
