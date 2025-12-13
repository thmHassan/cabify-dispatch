export const lockBodyScroll = () => {
  document.body.style.height = "100vh";
  document.body.style.overflow = "hidden";
};

export const unlockBodyScroll = () => {
  document.body.style.height = "auto";
  document.body.style.overflow = "auto";
};

export const replaceSlash = (params, url) => {
  const urlParams = Object.entries(params).map(([key, value]) => {
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    return `${encodedKey}=${encodedValue}`;
  });
  const urlString = urlParams.join("&");
  return url + "?" + urlString;
};

export const convertToFormData = (data) => {
  const formData = new FormData();

  Object.keys(data).forEach((key) => {
    const value = data[key];

    if (value !== null && value !== undefined) {
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => formData.append(`${key}[]`, v));
      } else if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  });

  return formData;
};

export const toYesNo = (value, type = 1, capitalize = false) => {
  if (typeof value !== "boolean") return value;

  const format = (text) =>
    capitalize ? text.charAt(0).toUpperCase() + text.slice(1) : text;

  switch (type) {
    case 1: // yes / no
      return value ? format("yes") : format("no");

    case 2: // enable / disable
      return value ? format("enable") : format("disable");

    case 3: // on / off
      return value ? format("on") : format("off");

    default:
      return value;
  }
};

export const toBoolean = (value, type = 1) => {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();

    switch (type) {
      case 1: // yes / no
        if (lower === "yes") return true;
        if (lower === "no") return false;
        break;

      case 2: // enable / disable
        if (["enable", "enabled", "active", "true"].includes(lower))
          return true;
        if (["disable", "disabled", "inactive", "false"].includes(lower))
          return false;
        break;

      case 3: // on / off
        if (lower === "on") return true;
        if (lower === "off") return false;
        break;

      default:
        return value;
    }
  }

  return value;
};
