import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/modules/auth/types";
import {
  clearPersistedAuth,
  loadPersistedAuth,
  savePersistedAuth,
} from "@/shared/services/authStorage";
import { clearAccessToken, setAccessToken } from "@/shared/services/authToken";

export type AuthState = {
  isAuthenticated: boolean;
  displayName: string;
  email: string;
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  isAuthenticated: false,
  displayName: "",
  email: "",
  token: null,
  user: null,
  hydrated: false,
};

function applyAuthenticatedState(
  state: AuthState,
  token: string,
  user: AuthUser
): void {
  state.isAuthenticated = true;
  state.token = token;
  state.user = user;
  state.displayName = `${user.firstName} ${user.lastName}`.trim();
  state.email = user.email;
  setAccessToken(token);
  savePersistedAuth({ token, user });
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    rehydrate: (state) => {
      const persisted = loadPersistedAuth();
      if (persisted) {
        applyAuthenticatedState(state, persisted.token, persisted.user);
      }
      state.hydrated = true;
    },
    login: (state, action: PayloadAction<{ token: string; user: AuthUser }>) => {
      applyAuthenticatedState(state, action.payload.token, action.payload.user);
      state.hydrated = true;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.displayName = "";
      state.email = "";
      state.token = null;
      state.user = null;
      state.hydrated = true;
      clearAccessToken();
      clearPersistedAuth();
    },
    updateUser: (state, action: PayloadAction<AuthUser>) => {
      if (!state.token) return;
      applyAuthenticatedState(state, state.token, action.payload);
      state.hydrated = true;
    },
  },
});

export const { login, logout, rehydrate, updateUser } = authSlice.actions;
export const authReducer = authSlice.reducer;
