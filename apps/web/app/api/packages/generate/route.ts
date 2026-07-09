import { NextResponse } from 'next/server';

import { PackageService } from '@/server/package-service';
import { createAiProvider } from '@/server/ai-provider-factory';
import { errorResponse } from '@/lib/route-response';

async function getService(siteKey?: string) {
  const configDir = process.env.CONFIG_DIR ?? './config';
  const aiProvider = await createAiProvider(configDir, siteKey);
  return new PackageService(configDir, { aiProvider });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      inputText?: string;
      inputMode?: 'ai_prompt' | 'source_material';
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

    const service = await getService(body.siteKey);
    const result = await service.generate({
      inputText: body.inputText,
      inputMode: body.inputMode,
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
