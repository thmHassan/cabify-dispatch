import { createSlice } from "@reduxjs/toolkit";
import { SLICE_BASE_NAME } from "./constants";

const initialState = {
  id: null,
  avatar: "",
  name: "",
  email: "",
};

const userSlice = createSlice({
  name: `${SLICE_BASE_NAME}/user`,
  initialState,
  reducers: {
    setUser(state, action) {
      state.id = action.payload?.id ?? null;
      state.avatar = action.payload?.avatar ?? "";
      state.name = action.payload?.name ?? "";
      state.email = action.payload?.email ?? "";
    },
    clearUser(state) {
      state.id = null;
      state.avatar = "";
      state.name = "";
      state.email = "";
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
