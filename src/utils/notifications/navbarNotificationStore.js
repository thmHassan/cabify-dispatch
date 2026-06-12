const STORAGE_KEY = "navbar_notifications";
const LEGACY_STORAGE_KEY = "notifications";
const MAX_NOTIFICATIONS = 100;

const listeners = new Set();

const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);

    const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacySaved) return [];

    const legacyNotifications = JSON.parse(legacySaved).map((notification) => ({
      id: notification.id,
      title: notification.title || "Notification",
      description: notification.description || notification.message || "",
      meta: notification.client_id ? `Client: ${notification.client_id}` : null,
      type: notification.type || "send-reminder",
      timestamp: notification.timestamp || new Date().toISOString(),
      read: Boolean(notification.read),
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyNotifications));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacyNotifications;
  } catch {
    return [];
  }
};

const saveToStorage = (notifications) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error("Error saving navbar notifications:", error);
  }
};

const notifyListeners = (notifications) => {
  listeners.forEach((listener) => listener(notifications));
};

export const subscribeNavbarNotifications = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getNavbarNotifications = () => loadFromStorage();

export const addNavbarNotification = (notification) => {
  if (!notification?.title) return loadFromStorage();

  const nextNotification = {
    read: false,
    ...notification,
    id: notification.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: notification.timestamp || new Date().toISOString(),
  };

  const updated = [nextNotification, ...loadFromStorage()].slice(0, MAX_NOTIFICATIONS);
  saveToStorage(updated);
  notifyListeners(updated);
  return updated;
};

export const markAllNavbarNotificationsRead = () => {
  const updated = loadFromStorage().map((notification) => ({
    ...notification,
    read: true,
  }));
  saveToStorage(updated);
  notifyListeners(updated);
  return updated;
};

export const deleteNavbarNotification = (id) => {
  const updated = loadFromStorage().filter((notification) => notification.id !== id);
  saveToStorage(updated);
  notifyListeners(updated);
  return updated;
};

export const clearNavbarNotifications = () => {
  saveToStorage([]);
  notifyListeners([]);
  return [];
};
