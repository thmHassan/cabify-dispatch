import ApiService from "./ApiService";

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

  return ApiService.fetchData({
    url: "/company/login",
    method: "post",
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export async function apiSignOut() {
  return ApiService.fetchData({
    url: "/sign-out",
    method: "post",
  });
}
