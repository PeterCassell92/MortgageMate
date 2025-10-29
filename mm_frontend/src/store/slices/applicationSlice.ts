import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Application-level state slice
 * Manages global application state like loading indicators
 */

export interface ApplicationState {
  isLoading: boolean; // Global loading state (e.g., chat creation, major operations)
}

const initialState: ApplicationState = {
  isLoading: false,
};

const applicationSlice = createSlice({
  name: 'application',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setLoading } = applicationSlice.actions;
export default applicationSlice.reducer;
