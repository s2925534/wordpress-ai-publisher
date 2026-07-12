import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { errorResponse } from '@/lib/route-response';
import { AuthService, SESSION_COOKIE_NAME } from '@/server/auth-service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const { email, password } = loginSchema.parse(await request.json());
    const authService = new AuthService();
    const user = await authService.verifyCredentials(email, password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'invalid_credentials', message: 'Invalid email or password.' } },
        { status: 401 }
      );
    }

    const session = await authService.createSession(user.id);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.APP_ENV === 'production',
      path: '/',
      expires: session.expiresAt
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
