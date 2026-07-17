import { isRejectedWithValue } from '@reduxjs/toolkit';

import { AppLogger } from './logger';

/**
 * Log a warning and show a toast!
 */
export const rtkQueryErrorLogger =
(api) => (next) => (action) => {
  // RTK Query uses `isRejectedWithValue` to indicate a rejected request
  if (isRejectedWithValue(action)) {
    const endpointName = action?.meta?.arg?.endpointName || 'UnknownEndpoint';
    const status = action?.payload?.status || 'ERROR';

    const isClientError = typeof status === 'number' && status >= 400 && status < 500;
    
    if (isClientError) {
      if (status !== 402 && status !== 401) {
        AppLogger.warn(`RTK_QUERY`, `Endpoint: ${endpointName} failed with status: ${status}`, action.payload);
      }
    } else {
      AppLogger.error(`RTK_QUERY`, `Endpoint: ${endpointName} failed with status: ${status}`, action.payload);
    }
    AppLogger.api('FAIL', endpointName, status);
  } else if (action?.type?.endsWith('/fulfilled')) {
    const endpointName = action?.meta?.arg?.endpointName || 'UnknownEndpoint';
    AppLogger.api('OK', endpointName, 200);
  }

  return next(action);
};