import { useState, useEffect, useRef, useMemo } from "react";
import useAuth from "../../../utils/hooks/useAuth";
import SettingIcon from "../../svg/SettingIcon";
import NotificationIcon from "../../svg/NotificationIcon";
import UsersIcon from "../../svg/UsersIcon"
import AppLogoIcon from "../../svg/AppLogoIcon";
import { NAV_ELEMENTS } from "../../../constants/nav.route.constant/nav.route.constant";
import NavElement from "./components/NavElement";
import SearchBar from "../../shared/SearchBar/SearchBar";
import { useAppSelector } from "../../../store";
import UserDropdown from "../../shared/UserDropdown";
import { FaSignOutAlt, FaUser } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { ACCOUNTS_PATH } from "../../../constants/routes.path.constant/client.route.path.constant";
import AppLogoLoader from "../../shared/AppLogoLoader";
import SearchIcon from "../../svg/SearchIcon";
import DrawerIcon from "../../svg/DrawerIcon";
import CloseIcon from "../../svg/CloseIcon";
import PageSubTitle from "../../ui/PageSubTitle/PageSubTitle";
import { PlainSwitch } from "../../ui/Switch/Switch ";
import { useSocket, useSocketStatus} from "../../routes/SocketProvider";
import { filterNavByTenantFeatures } from "../../../utils/functions/featureVisibilityFilter";
import { getTenantData } from "../../../utils/functions/tokenEncryption";

const UserPageContainer = ({ children }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Load notifications from localStorage on initial render
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
      return [];
    }
  });
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef(null);

  const { signOut } = useAuth();
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const rawTenant = getTenantData();
  const tenantData = rawTenant?.data || {};
  const location = useLocation();
  const socket = useSocket();
  const isConnected = useSocketStatus();

  const filteredNavElements = useMemo(
    () => filterNavByTenantFeatures(NAV_ELEMENTS, tenantData),
    [tenantData]
  );

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [notifications]);

  useEffect(() => {
    if (!socket) return;

    console.log("📢 RECEIVED send-reminder:");

    const handleSendReminder = (data) => {
      console.log("📢 RECEIVED send-reminder event:", data);
      
      setNotifications((prev) => {
        const newNotification = {
          id: Date.now(),
          ...data,
          timestamp: new Date().toISOString(), // Store as ISO string for localStorage compatibility
          read: false
        };
        console.log("Adding notification:", newNotification);
        return [newNotification, ...prev];
      });
      
      if (Notification.permission === "granted") {
        new Notification("New Reminder", {
          body: data.description || data.message || "You have a new reminder",
          icon: "/notification-icon.png"
        });
      }
    };

    const handleConnect = () => {
      console.log("🔌 Socket connected in component:", socket.id);
      console.log("🔌 Registering send-reminder listener on connect");
    };

    const handleDisconnect = () => {
      console.log("❌ Socket disconnected");
    };

    // Register listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("send-reminder", handleSendReminder);

    console.log("🔌 All listeners registered");

    return () => {
      console.log("🔌 Cleaning up listeners");
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("send-reminder", handleSendReminder);
      socket.offAny();
    };
  }, [socket]);

  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
    // Mark all as read when opening the dropdown
    if (!isNotificationOpen) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    // Also clear from localStorage
    localStorage.removeItem('notifications');
  };

  useEffect(() => {
    const actualUnreadCount = notifications.filter(n => !n.read).length;
    setUnreadCount(actualUnreadCount);
  }, [notifications]);

  const handleDeleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  // Close sidebar on route change for small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };

    // Close sidebar when location changes on small screens
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [location]);

  const handleProfile = () => navigate(ACCOUNTS_PATH);
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex">
       <div
  className={`
    border-r-[0.7px] border-[#7A7A7A] pb-[21px] 
    h-screen overflow-auto fixed z-[70] bg-[#ffffff]
    transition-all duration-300 ease-in-out

    ${isSidebarOpen ? "w-[19.7rem]" : "w-16"}   /* width change here */
    
    /* Mobile slide animation */
    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
    lg:translate-x-0
  `}
>

        <div className={`${isSidebarOpen ? "mb-10" : "mb-0"} px-6 lg:px-8 flex items-center justify-center relative`}>
          <AppLogoIcon height={95} width={95} />
    <button
  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
  className="absolute top-4 right-[13px] w-8 h-8  flex items-center justify-center transition lg:block md:hidden"
>
  {isSidebarOpen ? (
    <CloseIcon width={18} height={18} fill="#3D3D3D" /> 
  ) : (
    <DrawerIcon width={30} height={30} fill="#000000" /> 
  )}
</button>
        </div>
        <div className="flex flex-col gap-[30px]">
          {filteredNavElements.map(({ title, routes }, index) => (
            <div key={index}>
              <div className={`${isSidebarOpen ? "block" : "hidden"} text-[#7A7A7A] px-6 lg:px-8 text-sm leading-[19px] font-semibold mb-[18px]`}>
                {title}
              </div>
              <div className="flex flex-col sm:gap-5 gap-4">
                {routes.map((navItem, iIndex) => {
                  return <NavElement key={iIndex} navItem={navItem} isSidebarOpen={isSidebarOpen}/>;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* overlay for small screens when sidebar is open */}
      <div
        className={`fixed inset-0 bg-black/40 lg:hidden z-[60] ${
          isSidebarOpen ? "block" : "hidden"
        }`}
        aria-hidden="true"
        onClick={() => setIsSidebarOpen(false)}
      ></div>
           <div
  className={`w-full transition-all duration-300 ease-in-out
    ${isSidebarOpen 
      ? "lg:ml-[19.7rem] lg:w-[calc(100%-325px)]" 
      : "lg:ml-16 lg:w-[calc(100%-64px)]"
    }
  `}
>
  <div className={`h-16 sm:h-[85px] bg-[#F5F5F5] px-2 sm:px-3 lg:pl-[15px] lg:pr-[25px] py-2 sm:pt-4 sm:pb-[15px] flex items-center justify-between fixed w-full ] z-50 ${isSidebarOpen 
      ? "lg:ml-0 lg:w-[calc(100%-315px)]" 
      : "lg:ml-0 lg:w-[calc(100%-64px)]"
    }`}>
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 pr-2 sm:pr-5">
            <button
              type="button"
              className="lg:hidden w-10 h-10 sm:w-[54px] sm:h-[54px] grid place-items-center bg-[#ffffff] rounded-lg mr-0.5 hover:bg-[#ffffff] flex-shrink-0"
              aria-label="Open menu"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="sm:block hidden">
                <DrawerIcon width={30} height={30} fill="#000000" />
              </span>
              <span className="sm:hidden block">
                <DrawerIcon width={24} height={24} fill="#000000" />
              </span>
            </button>
          </div>
          <div className="flex gap-1.5 sm:gap-3 lg:gap-5 items-center flex-shrink-0">
             <div className="relative" ref={notificationRef}>
              <button
                onClick={handleNotificationClick}
                className="flex min-w-[40px] h-[40px] sm:min-w-[50px] sm:h-[50px] rounded-full bg-[#FFFFFF] justify-center items-center relative hover:bg-gray-50 transition-colors"
              >
                <div className="w-[18px] h-[20px] sm:w-[22px] sm:h-[24px] flex items-center justify-center">
                  <NotificationIcon
                    width={18}
                    height={20}
                    className="w-full h-full"
                  />
                </div>
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] max-h-[500px] overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="overflow-y-auto max-h-[400px]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400 mb-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <h4 className="text-sm font-semibold text-gray-900 truncate">
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {notification.description}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  Client: {notification.client_id}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatTimestamp(notification.timestamp)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <UserDropdown
              options={[
                {
                  label: isLoggingOut ? "Logging out..." : "Logout",
                  icon: isLoggingOut ? () => <AppLogoLoader /> : FaSignOutAlt,
                  onClick: handleLogout,
                  disabled: isLoggingOut,
                },
              ]}
            >
              <div className="max-w-[200px] w-full rounded-[30px] bg-[#ffffff]  sm:py-[5px] px-1 sm:px-[5px] lg:pl-[5px] lg:pr-5 flex items-center gap-1.5 sm:gap-3">
                <div className="flex min-w-[40px] h-[40px] sm:min-w-[50px] sm:h-[50px] rounded-full bg-[#FFFFFF] justify-center items-center">
                <UsersIcon
                  width={24}
                  height={24}
                  className="w-full h-full"
                />
            </div>
                <div className="hidden sm:flex font-semibold w-[calc(100%-56px)] text-base sm:text-[18px] leading-5 sm:leading-[25px] truncate capitalize">
                  <span>{user.name || "Dispatch" }</span>
                </div>
              </div>
            </UserDropdown>
          </div>
        </div>
        {/* Mobile sticky search bar under the header */}
        {isMobileSearchOpen && (
          <div className="sm:hidden fixed top-16 left-0 right-0 z-50 bg-[#F5F5F5] border-t border-[#e5e5e5] px-3 py-2 flex items-center gap-2">
            <div className="w-full">
              <SearchBar className="!w-full !max-w-full" />
            </div>
            <button
              type="button"
              className="w-10 h-10 absolute right-5 rounded-full bg-[#ffffff] border border-[#e5e5e5] grid place-items-center"
              aria-label="Close search"
              onClick={() => setIsMobileSearchOpen(false)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 6L18 18"
                  stroke="#111111"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M18 6L6 18"
                  stroke="#111111"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}
        <div
          className={`${
            isMobileSearchOpen ? "mt-[112px]" : "mt-16"
          } sm:mt-[85px] min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-85px)] transition-all duration-300 ease-in-out`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default UserPageContainer;