import ApiService from "./ApiService";
import { REQUEST_HEADER_DATABASE_KEY } from "../constants/api.constant";

export async function apiSignIn(data) {
  return ApiService.fetchData({
    url: "/sign-in",
    method: "post",
    data,
  });
}

export async function apiAdminSignIn(data) {
  // Create FormData for the admin login API
  const formData = new FormData();
  formData.append('email', data.email);
  formData.append('password', data.password);
  // formData.append('role', data.role || 'superadmin');

  const database = String(data?.company_id ?? "").trim();

  return ApiService.fetchData({
    url: "/dispatcher/login",
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
      [REQUEST_HEADER_DATABASE_KEY]: database,
    },
  });
}

export async function apiSignOut() {
  return ApiService.fetchData({
    url: "/dispatcher/logout",
    method: "post",
  });
}

export async function apiForgotPassword(data) {
  // Create FormData for the forgot password API
  const formData = new FormData();
  formData.append('email', data.email);

  return ApiService.fetchData({
    url: "/company/forgot-password",
    method: "post",
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}
