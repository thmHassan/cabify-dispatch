import { SIGN_IN_PATH } from "../../constants/routes.path.constant/auth.route.path.constant";

const LIVE_API_PREFIX = "https://backend.cabifyit.com/api";

const normalizeBaseUrl = (url) => (url || "").replace(/\/$/, "");

const resolveApiPrefix = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (backendUrl) {
    return `${normalizeBaseUrl(backendUrl)}/api`;
  }

  if (import.meta.env.DEV || import.meta.env.VITE_NODE_ENV === "development") {
    return "http://127.0.0.1:8000/api";
  }

  return LIVE_API_PREFIX;
};

const apiPrefix = resolveApiPrefix();

const appConfig = {
  apiPrefix,
  authenticatedEntryPath: "/overview",
  unAuthenticatedEntryPath: SIGN_IN_PATH,
  locale: "en",
  enableMock: false,
};

export default appConfig;
