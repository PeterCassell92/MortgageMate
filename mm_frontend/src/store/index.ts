import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './slices/chatSlice';
import applicationReducer from './slices/applicationSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    application: applicationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;