import { NextResponse } from 'next/server';

import { packageUpdateSchema } from '@/lib/publish-schemas';
import { PackageService } from '@/server/package-service';

function getService() {
  return new PackageService(process.env.CONFIG_DIR ?? './config');
}

export async function GET(_request: Request, context: any) {
  const { packageId } = context.params;
  const service = getService();
  const record = await service.getPackage(packageId);

  return NextResponse.json({
    success: true,
    data: record
  });
}

export async function PATCH(request: Request, context: any) {
  const { packageId } = context.params;
  const payload = packageUpdateSchema.parse(await request.json());
  const service = getService();
  const updated = await service.updatePackage(packageId, payload);

  return NextResponse.json({
    success: true,
    data: updated
  });
}
