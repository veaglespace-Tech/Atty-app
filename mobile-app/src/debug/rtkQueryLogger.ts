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
      
      AppLogger.error(`RTK_QUERY`, `Endpoint: ${endpointName} failed with status: ${status}`, action.payload);
      AppLogger.api('FAIL', endpointName, status);
    } else if (action?.type?.endsWith('/fulfilled')) {
      const endpointName = action?.meta?.arg?.endpointName || 'UnknownEndpoint';
      AppLogger.api('OK', endpointName, 200);
    }

    return next(action);
  };
