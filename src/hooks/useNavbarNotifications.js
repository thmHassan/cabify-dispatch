import { useCallback, useEffect, useMemo, useState } from "react";
import { useSocket } from "../components/routes/SocketProvider";
import {
  addNavbarNotification,
  clearNavbarNotifications,
  deleteNavbarNotification,
  getNavbarNotifications,
  markAllNavbarNotificationsRead,
  subscribeNavbarNotifications,
} from "../utils/notifications/navbarNotificationStore";
import {
  buildNotificationFromSocket,
  NAVBAR_SOCKET_EVENTS,
} from "../utils/notifications/buildNotificationFromSocket";

const showBrowserNotification = (title, body) => {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  new Notification(title, {
    body,
    icon: "/notification-icon.png",
  });
};

export const useNavbarNotifications = () => {
  const socket = useSocket();
  const [notifications, setNotifications] = useState(getNavbarNotifications);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    return subscribeNavbarNotifications(setNotifications);
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "default") {
      return;
    }

    Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handlers = NAVBAR_SOCKET_EVENTS.map((event) => {
      const handler = (rawData) => {
        const notification = buildNotificationFromSocket(event, rawData);
        if (!notification) return;

        addNavbarNotification(notification);
        showBrowserNotification(notification.title, notification.description);
      };

      socket.on(event, handler);
      return { event, handler };
    });

    return () => {
      handlers.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
    };
  }, [socket]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        markAllNavbarNotificationsRead();
      }
      return nextOpen;
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearAll = useCallback(() => {
    clearNavbarNotifications();
  }, []);

  const deleteNotification = useCallback((id) => {
    deleteNavbarNotification(id);
  }, []);

  return {
    notifications,
    unreadCount,
    isOpen,
    toggleOpen,
    close,
    clearAll,
    deleteNotification,
  };
};
