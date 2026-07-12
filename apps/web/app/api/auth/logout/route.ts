import { NextRequest, NextResponse } from 'next/server';

import { AuthService, SESSION_COOKIE_NAME } from '@/server/auth-service';

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await new AuthService().destroySession(sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
