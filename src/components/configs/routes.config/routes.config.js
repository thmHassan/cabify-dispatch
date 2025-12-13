import authRoute from "./authRoute";
import clientRoute from "./clientRoute";

export const publicRoutes = [...authRoute];

export const protectedRoutes = [...clientRoute];
