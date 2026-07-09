import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/modules/auth/types";

export type AuthState = {
  isAuthenticated: boolean;
  displayName: string;
  email: string;
  token: string | null;
  user: AuthUser | null;
};

function loadAuthFromStorage(): AuthState {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, displayName: "", email: "", token: null, user: null };
  }
  const token = localStorage.getItem("accessToken");
  const userRaw = localStorage.getItem("authUser");
  if (!token || !userRaw) {
    return { isAuthenticated: false, displayName: "", email: "", token: null, user: null };
  }
  try {
    const user: AuthUser = JSON.parse(userRaw);
    return {
      isAuthenticated: true,
      token,
      user,
      displayName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
    };
  } catch {
    return { isAuthenticated: false, displayName: "", email: "", token: null, user: null };
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: loadAuthFromStorage,
  reducers: {
    login: (
      state,
      action: PayloadAction<{ token: string; user: AuthUser }>
    ) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.displayName = `${action.payload.user.firstName} ${action.payload.user.lastName}`.trim();
      state.email = action.payload.user.email;

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", action.payload.token);
        localStorage.setItem("authUser", JSON.stringify(action.payload.user));
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.displayName = "";
      state.email = "";
      state.token = null;
      state.user = null;

      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("authUser");
      }
    },
  },
});

export const { login, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
