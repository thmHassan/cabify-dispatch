import { lazy } from "react";
import * as KEY from "../../../constants/routes.key.constant/client.route.key.constant";
import * as PATH from "../../../constants/routes.path.constant/client.route.path.constant";
import { path } from "framer-motion/client";

const clientRoute = [
  {
    key: KEY.OVERVIEW_KEY,
    path: PATH.OVERVIEW_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/Overview")),
    authority: [],
  },
  {
    key: KEY.ACCOUNTS_KEY,
    path: PATH.ACCOUNTS_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/Accounts")),
    authority: [],
  },
  {
    key: KEY.CANCELLATIONS_KEY,
    path: PATH.CANCELLATIONS_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/Cancellations")),
    authority: [],
  },
  {
    key: KEY.DRIVERS_MANAGEMENT_KEY,
    path: PATH.DRIVERS_MANAGEMENT_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/DriversManagement")),
    authority: [],
  },
  {
    key: KEY.DRIVER_DETAILS_KEY,
    path: PATH.DRIVER_DETAILS_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/DriversManagement/components/DriverDetails")),
    authority: [],
  },
  {
    key: KEY.GENERAL_NOTIFICATION_KEY,
    path: PATH.GENERAL_NOTIFICATION_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/GeneralNotification")),
    authority: [],
  },
  {
    key: KEY.LOST_FOUND_KEY,
    path: PATH.LOST_FOUND_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/LostFound")),
    authority: [],
  },
  {
    key: KEY.MAP_KEY,
    path: PATH.MAP_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/Map")),
    authority: [],
  },
  {
    key: KEY.RIDES_MANAGEMENT_KEY,
    path: PATH.RIDES_MANAGEMENT_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/RidesManagement")),
    authority: [],
  },
  {
    key: KEY.SOS_KEY,
    path: PATH.SOS_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/SOS")),
    authority: [],
  },
  {
    key: KEY.TICKETS_KEY,
    path: PATH.TICKETS_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/Tickets")),
    authority: [],
  },
  {
    key: KEY.USERS_KEY,
    path: PATH.USERS_PATH,
    component: lazy(() => import("../../../views/dispatch/pages/Users")),
    authority: [],
  },
];

export default clientRoute;
