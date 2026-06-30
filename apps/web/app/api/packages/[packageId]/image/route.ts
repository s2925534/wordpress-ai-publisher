import { NextResponse } from 'next/server';

import { PackageService } from '@/server/package-service';
import { errorResponse } from '@/lib/route-response';

function getService() {
  return new PackageService(process.env.CONFIG_DIR ?? './config');
}

export async function POST(_request: Request, context: any) {
  try {
    const { packageId } = context.params;
    const service = getService();
    const result = await service.prepareImage(packageId);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return errorResponse(error);
  }
}
