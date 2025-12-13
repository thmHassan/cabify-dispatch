import { combineReducers } from "@reduxjs/toolkit";
import app from "./commonSlice.js";

const reducer = combineReducers({
  app,
});

export * from "./commonSlice.js";

export default reducer;
