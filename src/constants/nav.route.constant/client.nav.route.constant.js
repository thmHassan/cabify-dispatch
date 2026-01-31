import DashboardIcon from "../../components/svg/DashboardIcon";
import MapsConfigurationIcon from "../../components/svg/MapsConfigurationIcon";
import GeneralNotificationIcon from "../../components/svg/GeneralNotificationIcon";
import CancellationsIcon from "../../components/svg/CancellationsIcon";
import UsersIcon from "../../components/svg/UsersIcon";
import DriverIcon from "../../components/svg/DriverIcon";
import RidesManagementIcon from "../../components/svg/RidesManagementIcon";
import AccountIcon from "../../components/svg/AccountIcon";
import TicketsIcon from "../../components/svg/TicketsIcon";
import SosIcon from "../../components/svg/SosIcon";
import LostFoundIcon from "../../components/svg/LostFoundIcon";
import * as KEY from "../routes.key.constant/client.route.key.constant";
import * as PATH from "../routes.path.constant/client.route.path.constant";

const userNavRoutes = [
  {
    title: "Main Menu",
    routes: [
      {
        key: KEY.OVERVIEW_KEY,
        title: "Dashboard",
        icon: {
          active: DashboardIcon,
          component: DashboardIcon,
          size: 20,
        },
        route: PATH.OVERVIEW_PATH,
        active: [],
        isSubMenu: false,
        subMenu: [],
        isStatic: false,
      },
      {
        key: KEY.MAP_KEY,
        title: "Map",
        icon: {
          active: MapsConfigurationIcon,
          component: MapsConfigurationIcon,
          size: 20,
        },
        route: PATH.MAP_PATH,
        active: [],
        isSubMenu: false,
        subMenu: [],
        isStatic: false,
      },
      {
        key: KEY.GENERAL_NOTIFICATION_KEY,
        title: "General Notification",
        icon: {
          active: GeneralNotificationIcon,
          component: GeneralNotificationIcon,
          size: 20,
        },
        route: PATH.GENERAL_NOTIFICATION_PATH,
        active: [],
        isSubMenu: false,
        subMenu: [],
        isStatic: false,
      },
      {
        key: KEY.CANCELLATIONS_KEY,
        title: "Cancellations",
        icon: {
          active: CancellationsIcon,
          component: CancellationsIcon,
          size: 20,
        },
        route: PATH.CANCELLATIONS_PATH,
        active: [],
        isSubMenu: false,
        subMenu: [],
        isStatic: false,
      },
      {
        key: KEY.USERS_KEY,
        title: "Users",
        icon: {
          active: UsersIcon,
          component: UsersIcon,
          size: 20,
        },
        route: PATH.USERS_PATH,
        active: [],
        isSubMenu: false,
        subMenu: [],
        isStatic: false,
      },
      {
        key: KEY.DRIVERS_MANAGEMENT_KEY,
        title: "Drivers Management",
        icon: {
          active: DriverIcon,
          component: DriverIcon,
          size: 20,
        },
        route: PATH.DRIVERS_MANAGEMENT_PATH,
        active: [],
        isSubMenu: false,
        subMenu: [],
        isStatic: false,
      },
      {
        key: KEY.RIDES_MANAGEMENT_KEY,
        title: "Rides Management",
        icon: {
          active: RidesManagementIcon,
          component: RidesManagementIcon,
          size: 20,
        },
        route: PATH.RIDES_MANAGEMENT_PATH,
        active: [],
        isSubMenu: false,
        subMenu: [],
        isStatic: false,
      },
      // {
      //   key: KEY.ACCOUNTS_KEY,
      //   title: "Accounts",
      //   icon: {
      //     active: AccountIcon,
      //     component: AccountIcon,
      //     size: 20,
      //   },
      //   route: PATH.ACCOUNTS_PATH,
      //   active: [],
      //   isSubMenu: false,
      //   subMenu: [],
      //   isStatic: false,
      // },
      {
        key: KEY.TICKETS_KEY,
        title: "Tickets",
        icon: {
          active: TicketsIcon,
          component: TicketsIcon,
          size: 20,
        },
        route: PATH.TICKETS_PATH,
        active: [],
        isSubMenu: false,
        subMenu: [],
        isStatic: false,
      },
      // {
      //   key: KEY.SOS_KEY,
      //   title: "SOS",
      //   icon: {
      //     active: SosIcon,
      //     component: SosIcon,
      //     size: 20,
      //   },
      //   route: PATH.SOS_PATH,
      //   active: [],
      //   isSubMenu: false,
      //   subMenu: [],
      //   isStatic: false,
      // },
      {
        key: KEY.LOST_FOUND_KEY,
        title: "Lost & Found",
        icon: {
          active: LostFoundIcon,
          component: LostFoundIcon,
          size: 20,
        },
        route: PATH.LOST_FOUND_PATH,
        active: [],
        isSubMenu: false,
        subMenu: [],
        isStatic: false,
      },
    ],
  },
];

export default userNavRoutes;
