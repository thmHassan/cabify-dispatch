import { useState, useEffect } from "react";
import useAuth from "../../../utils/hooks/useAuth";
import SettingIcon from "../../svg/SettingIcon";
import NotificationIcon from "../../svg/NotificationIcon";
import userImage from "../../../assets/Images/71067d46ba23cf7a8102bc3d1fab56453de3b958.jpg";
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

const UserPageContainer = ({ children }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const { signOut } = useAuth();
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const location = useLocation();

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
          {NAV_ELEMENTS.map(({ title, routes }, index) => (
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
            <div className="flex min-w-[40px] h-[40px] sm:min-w-[50px] sm:h-[50px] rounded-full bg-[#FFFFFF] justify-center items-center">
              <div className="w-[18px] h-[20px] sm:w-[22px] sm:h-[24px] flex items-center justify-center">
                <NotificationIcon
                  width={18}
                  height={20}
                  className="w-full h-full"
                />
              </div>
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
              <div className="max-w-[200px] w-full rounded-[30px] bg-[#ffffff] py-1 sm:py-[5px] px-1 sm:px-[5px] lg:pl-[5px] lg:pr-5 flex items-center gap-1.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={userImage}
                    alt=""
                    className="w-full h-full object-cover"
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
