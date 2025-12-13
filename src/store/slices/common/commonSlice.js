// src/store/commonSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { SLICE_BASE_NAME } from "./constants";

function loadPaginationFromStorage() {
  try {
    const raw = localStorage.getItem("pagination");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const initialState = {
  tabViewScreen: "",
  pagination: loadPaginationFromStorage(), // { [pageKey]: { currentPage: number, itemsPerPage: number } }
};

const commonSlice = createSlice({
  name: `${SLICE_BASE_NAME}/app`,
  initialState,
  reducers: {
    setTabViewScreen(state, action) {
      state.tabViewScreen = action.payload;
    },
    setPaginationConfig(state, action) {
      const { key, currentPage, itemsPerPage } = action.payload || {};
      if (!key) return;
      state.pagination[key] = {
        currentPage: Number(currentPage) || 1,
        itemsPerPage: Number(itemsPerPage) || 10,
      };
      try {
        localStorage.setItem("pagination", JSON.stringify(state.pagination));
      } catch {
        // ignore persist errors
      }
    },
  },
});

export const { setTabViewScreen, setPaginationConfig } = commonSlice.actions;

export default commonSlice.reducer;
