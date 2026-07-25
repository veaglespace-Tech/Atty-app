import { isRejectedWithValue } from '@reduxjs/toolkit';
import type { MiddlewareAPI, Middleware } from '@reduxjs/toolkit';
import { AppLogger } from './logger';

/**
 * Log a warning and show a toast!
 */
export const rtkQueryErrorLogger: Middleware =
  (api: MiddlewareAPI) => (next) => (action: any) => {
    // RTK Query uses `isRejectedWithValue` to indicate a rejected request
    if (isRejectedWithValue(action)) {
      const endpointName = action?.meta?.arg?.endpointName || 'UnknownEndpoint';
      const status = action?.payload?.status || 'ERROR';
      
      // Do not trigger the scary red LogBox for expected auth/subscription errors (401, 402, 403)
      if (status !== 401 && status !== 402 && status !== 403) {
        AppLogger.error(`RTK_QUERY`, `Endpoint: ${endpointName} failed with status: ${status}`, action.payload);
      }
      AppLogger.api('FAIL', endpointName, status);
    } else if (action?.type?.endsWith('/fulfilled')) {
      const endpointName = action?.meta?.arg?.endpointName || 'UnknownEndpoint';
      AppLogger.api('OK', endpointName, 200);
    }

    return next(action);
  };
