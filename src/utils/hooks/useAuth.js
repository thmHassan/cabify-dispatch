import React from "react";
import { useNavigate } from "react-router-dom";
import {
  apiSignIn,
  apiAdminSignIn,
  apiSignOut,
} from "../../services/AuthService";
import {
  setUser,
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
  removeEncryptedToken,
  clearAllAuthData,
  isAuthenticated,
  getUserDataFromToken,
  storeTenantId,
} from "../functions/tokenEncryption";

function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const query = useQuery();

  const { token, signedIn } = useAppSelector((state) => state.auth.session);

  const signIn = async (values) => {
    try {
      const resp = await apiSignIn(values);
      if (resp.data) {
        const { token } = resp.data;
        console.log(resp.data.user, "resp.data.user====");
        dispatch(signInSuccess(token));
        if (resp.data.user) {
          dispatch(
            setUser(
              resp.data.user || {
                avatar: "",
                name: "Anonymous",
                // role: "client",
                email: "",
              }
            )
          );
        }
        const redirectUrl = query.get(REDIRECT_URL_KEY);
        navigate(redirectUrl ? redirectUrl : appConfig.authenticatedEntryPath);
        return {
          status: "success",
          message: "",
        };
      }
    } catch (errors) {
      return {
        status: "failed",
        message: errors?.response?.data?.message || errors.toString(),
      };
    }
  };

  const adminSignIn = async (values) => {
    try {
      const resp = await apiAdminSignIn(values);
      // Log response for debugging
      console.log("adminSignIn response:", resp);

      // Try to extract token from common response shapes
      const data = resp?.data || {};
      const possibleToken =
        data.access_token || data.token || data.auth_token ||
        data.data?.access_token || data.data?.token || data.data?.auth_token ||
        data.accessToken || data.tokenValue || null;

      // Determine success: prefer explicit success flag, otherwise token presence
      const isSuccess = data.success === 1 || data.success === true || !!possibleToken;

      if (isSuccess) {
        const token = possibleToken;
        const user = data.user || data.data?.user || data.admin || null;

        if (token) {
          // Store encrypted token in localStorage under 'admin_token'
          storeEncryptedToken(token);

          // Dispatch to Redux store
          dispatch(signInSuccess(token));
        } else {
          // If no token but success, still mark signed in to restore state
          dispatch(signInSuccess("restored"));
        }

        if (user) {
          dispatch(
            setUser({
              avatar: user.avatar || "",
              name: user.name || "Anonymous",
              email: user.email || values.email,
            })
          );
        }

        // Save tenant id (if returned) to localStorage so BaseService can include it in headers
        try {
          const tenantId = data.tenant_id || data.tenantId || data.data?.tenant_id || data.data?.tenantId || null;
          if (tenantId) {
            storeTenantId(tenantId);
          }
        } catch (e) {
          // ignore tenant storage errors
        }

        // Redirect to home page on success
        const redirectUrl = query.get(REDIRECT_URL_KEY);
        navigate(redirectUrl ? redirectUrl : appConfig.authenticatedEntryPath);

        return {
          status: "success",
          message: "Login successful",
          token: token || null,
          data,
        };
      }

      return {
        status: "failed",
        message: data?.message || "Login failed",
        data,
      };
    } catch (errors) {
      return {
        status: "failed",
        message: errors?.response?.data?.message || errors.toString(),
      };
    }
  };

  const handleSignOut = () => {
    clearAllAuthData();

    dispatch(signOutSuccess());
    dispatch(
      setUser({
        avatar: "",
        name: "",
        email: "",
      })
    );

    navigate(appConfig.unAuthenticatedEntryPath);
  };

  const signOut = () => {
    // Simple logout - just remove token and redirect
    handleSignOut();
  };

  // Clear any legacy admin key and restore auth state on app start
  React.useEffect(() => {
    const legacyAdminData = localStorage.getItem("admin");
    if (legacyAdminData) {
      console.log("Clearing legacy admin data from localStorage");
      localStorage.removeItem("admin");
    }

    // Restore authentication state from encrypted token
    if (isAuthenticated() && !signedIn) {
      console.log("Restoring authentication state from encrypted token");
      dispatch(signInSuccess("restored")); // We don't need the actual token in Redux

      // Restore user data from token
      const userData = getUserDataFromToken();
      if (userData) {
        dispatch(setUser(userData));
      }
    }
  }, [dispatch, signedIn]);

  return {
    authenticated: isAuthenticated() || (token && signedIn),
    signIn,
    adminSignIn,
    signOut,
  };
}

export default useAuth;
