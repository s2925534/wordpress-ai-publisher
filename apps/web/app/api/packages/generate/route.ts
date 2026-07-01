import { NextResponse } from 'next/server';

import { PackageService } from '@/server/package-service';
import { errorResponse } from '@/lib/route-response';

function getService() {
  return new PackageService(process.env.CONFIG_DIR ?? './config');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      inputText?: string;
      sourceSafetyType?: 'my_own_text' | 'public_reference' | 'third_party_text' | 'notes_only' | 'unknown';
      siteKey?: string;
      contentProfileKey?: string;
      aiSafeguard?: unknown;
    };

    if (!body.inputText || !body.sourceSafetyType) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'invalid_request',
            message: 'inputText and sourceSafetyType are required.'
          }
        },
        { status: 400 }
      );
    }

    const service = getService();
    const result = await service.generate({
      inputText: body.inputText,
      sourceSafetyType: body.sourceSafetyType,
      siteKey: body.siteKey,
      contentProfileKey: body.contentProfileKey,
      aiSafeguard: body.aiSafeguard as never
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return errorResponse(error);
  }
}
