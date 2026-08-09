"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login, logout, updateUser } from "@/store/slices/authSlice";
import type { AuthUser } from "../types";

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);

  const signIn = useCallback(
    (token: string, user: AuthUser) => {
      dispatch(login({ token, user }));
    },
    [dispatch]
  );

  const signOut = useCallback(() => {
    dispatch(logout());
    router.push("/login");
  }, [dispatch, router]);

  const setUser = useCallback(
    (user: AuthUser) => {
      dispatch(updateUser(user));
    },
    [dispatch]
  );

  return {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    token: auth.token,
    displayName: auth.displayName,
    email: auth.email,
    signIn,
    signOut,
    setUser,
  };
}
