import RtkQueryService from "../services/RtkQueryService";
import auth from "./slices/auth";
import app from "./slices/common";
import { combineReducers } from "redux";

const staticReducers = {
  auth,
  app,
  [RtkQueryService.reducerPath]: RtkQueryService.reducer,
};
const rootReducer = (asyncReducers) => (state, action) => {
  const combinedReducer = combineReducers({
    ...staticReducers,
    ...asyncReducers,
  });
  return combinedReducer(state, action);
};

export default rootReducer;
