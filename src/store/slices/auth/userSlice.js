import { createSlice } from "@reduxjs/toolkit";
import { SLICE_BASE_NAME } from "./constants";

const initialState = {
  avatar: "",
  name: "",
  email: "",
  // role: "client", // Default to superadmin for encrypted token users
};

const userSlice = createSlice({
  name: `${SLICE_BASE_NAME}/user`,
  initialState,
  reducers: {
    setUser(state, action) {
      state.avatar = action.payload?.avatar;
      state.email = action.payload?.email;
      state.name = action.payload?.name;
      // state.role = action.payload?.role;
    },
  },
});

export const { setUser } = userSlice.actions;
export default userSlice.reducer;
