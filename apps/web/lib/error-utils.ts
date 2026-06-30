import { ZodError } from 'zod';

function redactValue(text: string, value?: string | null) {
  if (!value) {
    return text;
  }

  return text.split(value).join('[redacted]');
}

export function redactSecrets(text: string, values: Array<string | undefined | null> = []) {
  let result = text;

  for (const value of values) {
    result = redactValue(result, value);
  }

  return result;
}

export function formatErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const field = issue.path.length ? issue.path.join('.') : '(root)';
    return `${field}: ${issue.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

export function classifyErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400;
  }

  if (error instanceof Error) {
    if (/not found/i.test(error.message)) {
      return 404;
    }

    if (/required|invalid|missing/i.test(error.message)) {
      return 400;
    }
  }

  return 500;
}
