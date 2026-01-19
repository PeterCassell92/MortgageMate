import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './slices/chatSlice';
import applicationReducer from './slices/applicationSlice';
import serverStatusReducer from './slices/serverStatusSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    application: applicationReducer,
    serverStatus: serverStatusReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;