import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

/**
 * Server status slice
 * Manages backend health check state for server warming
 */

export interface ServerStatusState {
  backendHealthCheckStatus: string | null;
  backendHealthCheckSent: boolean;
  backendHealthCheckResponseReceived: boolean;
  backendHealthCheckTimestamp: string | null;
  backendHealthCheckError: string | null;
}

const initialState: ServerStatusState = {
  backendHealthCheckStatus: null,
  backendHealthCheckSent: false,
  backendHealthCheckResponseReceived: false,
  backendHealthCheckTimestamp: null,
  backendHealthCheckError: null,
};

/**
 * Health check async thunk with retries
 * - 60s timeout per attempt (server might be waking up)
 * - Up to 3 retry attempts
 * - Silent background operation
 */
export const checkBackendHealth = createAsyncThunk(
  'serverStatus/checkHealth',
  async (_, { rejectWithValue }) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4321';
    const maxRetries = 3;
    const timeout = 60000; // 60 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Server Warming] Health check attempt ${attempt}/${maxRetries}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[Server Warming] ✓ Health check successful:', data);

        return {
          status: data.status || 'ok',
          timestamp: data.timestamp || new Date().toISOString(),
        };
      } catch (error: any) {
        console.log(`[Server Warming] Attempt ${attempt} failed:`, error.message);

        // If this was the last attempt, reject
        if (attempt === maxRetries) {
          const errorMessage = error.name === 'AbortError'
            ? 'Health check timed out after 60s'
            : error.message || 'Health check failed';

          console.error('[Server Warming] ✗ All health check attempts failed:', errorMessage);
          return rejectWithValue(errorMessage);
        }

        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // This shouldn't be reached, but TypeScript needs it
    return rejectWithValue('Health check failed after all retries');
  }
);

const serverStatusSlice = createSlice({
  name: 'serverStatus',
  initialState,
  reducers: {
    resetHealthCheck: (state) => {
      state.backendHealthCheckStatus = null;
      state.backendHealthCheckSent = false;
      state.backendHealthCheckResponseReceived = false;
      state.backendHealthCheckTimestamp = null;
      state.backendHealthCheckError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkBackendHealth.pending, (state) => {
        state.backendHealthCheckSent = true;
        state.backendHealthCheckResponseReceived = false;
        state.backendHealthCheckError = null;
      })
      .addCase(checkBackendHealth.fulfilled, (state, action: PayloadAction<{ status: string; timestamp: string }>) => {
        state.backendHealthCheckStatus = action.payload.status;
        state.backendHealthCheckResponseReceived = true;
        state.backendHealthCheckTimestamp = action.payload.timestamp;
        state.backendHealthCheckError = null;
      })
      .addCase(checkBackendHealth.rejected, (state, action) => {
        state.backendHealthCheckResponseReceived = true;
        state.backendHealthCheckError = action.payload as string || 'Unknown error';
        state.backendHealthCheckTimestamp = new Date().toISOString();
      });
  },
});

export const { resetHealthCheck } = serverStatusSlice.actions;
export default serverStatusSlice.reducer;
