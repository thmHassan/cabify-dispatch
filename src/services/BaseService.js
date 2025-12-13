import axios from "axios";
import appConfig from "../components/configs/app.config";
import { REQUEST_HEADER_AUTH_KEY, TOKEN_TYPE, REQUEST_HEADER_DATABASE_KEY } from "../constants/api.constant";
import store, { setUser, signOutSuccess } from "../store";
import {
  clearAllAuthData,
  getDecryptedToken,
  getTenantId,
} from "../utils/functions/tokenEncryption";

const unauthorizedCode = [401, 403, 419];

const BaseService = axios.create({
  timeout: 60000,
  baseURL: appConfig.apiPrefix,
});

BaseService.interceptors.request.use(
  (config) => {
    // Get decrypted token from localStorage
    const accessToken = getDecryptedToken();

    if (accessToken) {
      config.headers[REQUEST_HEADER_AUTH_KEY] = `${TOKEN_TYPE}${accessToken}`;
    }

    // Add database (tenant) id header if available
    try {
      const tenantId = getTenantId();
      if (tenantId) {
        config.headers[REQUEST_HEADER_DATABASE_KEY] = tenantId;
      }
    } catch (e) {
      // ignore database header errors
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

BaseService.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    console.log(response, "response========");

    if (response && unauthorizedCode.includes(response.status)) {
      store.dispatch(signOutSuccess());
      store.dispatch(
        setUser({
          avatar: "",
          name: "",
          email: "",
          // role: "client",
        })
      );
      clearAllAuthData();

      if (window.location.pathname !== appConfig.unAuthenticatedEntryPath) {
        window.location.href = appConfig.unAuthenticatedEntryPath;
      }
    }

    return Promise.reject(error);
  }
);

export default BaseService;
