import { NextResponse } from 'next/server';

import { classifyErrorStatus, formatErrorMessage, redactSecrets } from '@/lib/error-utils';

type RouteErrorOptions = {
  fallbackMessage?: string;
};

export function errorResponse(error: unknown, options: RouteErrorOptions = {}) {
  const message = redactSecrets(formatErrorMessage(error));
  const status = classifyErrorStatus(error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: status === 400 ? 'invalid_request' : status === 404 ? 'not_found' : 'internal_error',
        message: message || options.fallbackMessage || 'Request failed.'
      }
    },
    { status }
  );
}
