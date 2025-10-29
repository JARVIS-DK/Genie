import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id?: number | string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  subscription_type?: string;
}

interface AuthState {
  user: AuthUser | null;
}

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
    },
    clearUser(state) {
      state.user = null;
    },
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
