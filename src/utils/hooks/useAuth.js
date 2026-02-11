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

function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const query = useQuery();

  const { signedIn } = useAppSelector((state) => state.auth.session);

  /* ---------------- NORMAL LOGIN ---------------- */
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

  /* ---------------- ADMIN LOGIN ---------------- */
  const adminSignIn = async (values) => {
    const resp = await apiAdminSignIn(values);
    const data = resp?.data || {};

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

  /* ---------------- LOGOUT ---------------- */
  const signOut = async () => {
    try {
      await apiSignOut();
    } catch (error) {
      // Log error but continue with logout process
      console.error("Logout API error:", error);
    } finally {
      // Always clear local data and redirect, even if API call fails
      clearAllAuthData();
      dispatch(signOutSuccess());
      dispatch(clearUser());
      navigate(appConfig.unAuthenticatedEntryPath);
    }
  };

  /* ---------------- RESTORE ON REFRESH ---------------- */
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
