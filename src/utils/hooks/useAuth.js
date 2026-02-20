import React from "react";
import { useNavigate } from "react-router-dom";
import {
  apiSignIn,
  apiAdminSignIn,
  apiSignOut,
} from "../../services/AuthService";
import {
  setUser,
  clearUser,
  signInSuccess,
  signOutSuccess,
  useAppDispatch,
  useAppSelector,
} from "../../store";
import appConfig from "../../components/configs/app.config";
import { REDIRECT_URL_KEY } from "../../constants/app.constant";
import useQuery from "./useQuery";
import {
  storeEncryptedToken,
  clearAllAuthData,
  isAuthenticated,
  storeTenantId,
  storeTenantData,
} from "../functions/tokenEncryption";

const API_ERROR_MAP = {
  "Database header is missing.": "Company ID is missing.",
  "Invalid database.":           "Invalid Company ID. Please check and try again.",
  "Invalid credentials.":        "Incorrect email or password. Please try again.",
  "User not found.":             "No account found with this email address.",
  "Account is disabled.":        "Your account has been disabled. Please contact support.",
};

const getFriendlyError = (rawMessage) => {
  if (!rawMessage) return "Something went wrong. Please try again.";
  if (API_ERROR_MAP[rawMessage]) return API_ERROR_MAP[rawMessage];
  const key = Object.keys(API_ERROR_MAP).find((k) =>
    rawMessage.toLowerCase().includes(k.toLowerCase())
  );
  return key ? API_ERROR_MAP[key] : rawMessage;
};

function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const query = useQuery();

  const { signedIn } = useAppSelector((state) => state.auth.session);

  const signIn = async (values) => {
    const resp = await apiSignIn(values);

    const token = resp?.data?.token;
    const user = resp?.data?.user;

    if (token && user) {
      dispatch(signInSuccess(token));

      const authUser = {
        id: user.id,
        avatar: user.avatar || "",
        name: user.name || "",
        email: user.email || "",
      };

      localStorage.setItem("auth_user", JSON.stringify(authUser));
      dispatch(setUser(authUser));

      navigate(
        query.get(REDIRECT_URL_KEY) || appConfig.authenticatedEntryPath
      );
    }
  };

  const adminSignIn = async (values) => {
    let resp;
    try {
      resp = await apiAdminSignIn(values);
    } catch (error) {
      const rawMessage =
        error?.response?.data?.message ||
        error?.message ||
        "";
      throw new Error(getFriendlyError(rawMessage));
    }

    const data = resp?.data || {};

    if (data?.error === 1 || data?.error === true) {
      throw new Error(getFriendlyError(data?.message));
    }

    const token =
      data.access_token ||
      data.token ||
      data.data?.access_token ||
      null;

    const user =
      data.user || data.data?.user || data.admin || null;

    if (token && user) {
      storeEncryptedToken(token);
      dispatch(signInSuccess(token));

      const authUser = {
        id: user.id,
        avatar: user.avatar || "",
        name: user.name || "",
        email: user.email || values.email,
      };

      localStorage.setItem("auth_user", JSON.stringify(authUser));
      dispatch(setUser(authUser));
    }

    const tenantId =
      data.tenant_id ||
      data.data?.tenant_id ||
      values.company_id ||
      null;

    if (tenantId) {
      storeTenantId(tenantId);
    }

    const companyData =
      data.company_data ||
      data.data?.company_data ||
      null;

    if (companyData) {
      storeTenantData(companyData);
    }

    navigate(
      query.get(REDIRECT_URL_KEY) || appConfig.authenticatedEntryPath
    );
  };

  const signOut = async () => {
    try {
      await apiSignOut();
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      clearAllAuthData();
      dispatch(signOutSuccess());
      dispatch(clearUser());
      navigate(appConfig.unAuthenticatedEntryPath);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated() && !signedIn) {
      dispatch(signInSuccess("restored"));

      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        dispatch(setUser(JSON.parse(storedUser)));
      }
    }
  }, [dispatch, signedIn]);

  return {
    authenticated: isAuthenticated(),
    signIn,
    adminSignIn,
    signOut,
  };
}

export default useAuth;