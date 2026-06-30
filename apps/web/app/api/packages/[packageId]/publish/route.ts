import { NextResponse } from 'next/server';

import { publishRequestSchema } from '@/lib/publish-schemas';
import { PackageService } from '@/server/package-service';
import { errorResponse } from '@/lib/route-response';

function getService() {
  return new PackageService(process.env.CONFIG_DIR ?? './config');
}

export async function POST(request: Request, context: any) {
  try {
    const { packageId } = context.params;
    const body = publishRequestSchema.parse({
      ...(await request.json()),
      packageId
    });

    const service = getService();
    const result = await service.publish(body);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return errorResponse(error);
  }
}
