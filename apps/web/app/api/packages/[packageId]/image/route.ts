import { NextResponse } from 'next/server';

import { PackageService } from '@/server/package-service';
import { createAiProvider } from '@/server/ai-provider-factory';
import { errorResponse } from '@/lib/route-response';

async function getService() {
  const configDir = process.env.CONFIG_DIR ?? './config';
  const aiProvider = await createAiProvider(configDir);
  return new PackageService(configDir, { aiProvider });
}

export async function POST(_request: Request, context: { params: Promise<{ packageId: string }> }) {
  try {
    const { packageId } = await context.params;
    const service = await getService();
    const result = await service.prepareImage(packageId);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return errorResponse(error);
  }
}
