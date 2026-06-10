import { SIGN_IN_PATH } from "../../constants/routes.path.constant/auth.route.path.constant";

const LIVE_API_PREFIX = "https://backend.cabifyit.com/api";

const apiPrefix =
  import.meta.env.VITE_NODE_ENV === "development"
    ? `${(import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000/").replace(/\/$/, "")}/api`
    : LIVE_API_PREFIX;

const appConfig = {
  apiPrefix,
  authenticatedEntryPath: "/overview",
  unAuthenticatedEntryPath: SIGN_IN_PATH,
  locale: "en",
  enableMock: false,
};

export default appConfig;
