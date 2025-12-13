import { Navigate, Route, Routes } from "react-router-dom";
import appConfig from "../configs/app.config";
import ProtectedRoute from "./ProtectedRoute";
import {
  protectedRoutes,
  publicRoutes,
} from "../configs/routes.config/routes.config";
import UserPageContainer from "../templates/UserPageContainer";
import AppRoute from "./AppRoute";
import PublicRoute from "./PublicRoute";

const { authenticatedEntryPath } = appConfig;

const AllRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute />}>
        <Route
          path="/"
          element={<Navigate replace to={authenticatedEntryPath} />}
        />
        {protectedRoutes.map((route, index) => (
          <Route
            key={route.key + index}
            path={route.path}
            element={
              <UserPageContainer>
                <AppRoute
                  routeKey={route.key}
                  component={route.component}
                  {...route.meta}
                />
              </UserPageContainer>
            }
          />
        ))}
        {/* Fallback route for when routes are not loaded yet */}
        <Route
          path="*"
          element={
            <div style={{ padding: "20px", textAlign: "center" }}>
              <p>Loading routes...</p>
              <p>User Role:</p>
              <p>Available routes:</p>
              <p>Route paths:</p>
            </div>
          }
        />
      </Route>
      <Route path="/" element={<PublicRoute />}>
        {publicRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <AppRoute
                routeKey={route.key}
                component={route.component}
                {...route.meta}
              />
            }
          />
        ))}
      </Route>
    </Routes>
  );
};

export default AllRoutes;
