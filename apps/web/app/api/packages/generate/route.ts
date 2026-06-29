import { NextResponse } from 'next/server';

import { GenerationService } from '@/server/generation-service';

function getService() {
  return new GenerationService(process.env.CONFIG_DIR ?? './config');
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    inputText?: string;
    sourceSafetyType?: 'my_own_text' | 'public_reference' | 'third_party_text' | 'notes_only' | 'unknown';
    siteKey?: string;
    contentProfileKey?: string;
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
  const result = await service.generatePackage({
    inputText: body.inputText,
    sourceSafetyType: body.sourceSafetyType,
    siteKey: body.siteKey,
    contentProfileKey: body.contentProfileKey
  });

  return NextResponse.json({
    success: true,
    data: result
  });
}
