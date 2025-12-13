import { configureStore } from "@reduxjs/toolkit";
import RtkQueryService from "../services/RtkQueryService";
import rootReducer from "./rootReducer";

const middlewares = [RtkQueryService.middleware];

const store = configureStore({
  reducer: rootReducer(),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }).concat(middlewares),
  devTools: import.meta.env.VITE_NODE_ENV === "development",
});

store.asyncReducers = {};

export function injectReducer(key, reducer) {
  if (store.asyncReducers) {
    if (store.asyncReducers[key]) {
      return false;
    }
    store.asyncReducers[key] = reducer;
    store.replaceReducer(rootReducer(store.asyncReducers));
  }
  return store;
}

export default store;
