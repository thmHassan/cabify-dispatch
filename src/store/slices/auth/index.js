import { combineReducers } from "@reduxjs/toolkit";
import session from "./sessionSlice.js";
import user from "./userSlice.js";

const reducer = combineReducers({
  session,
  user,
});

export * from "./sessionSlice.js";
export * from "./userSlice.js";

export default reducer;
