import { NextResponse } from 'next/server';

import { DiscoveryService } from '@/server/discovery-service';

function getService() {
  return new DiscoveryService(process.env.CONFIG_DIR ?? './config');
}

export async function GET(
  _request: Request,
  context: any
) {
  const { siteKey } = context.params;
  const service = getService();
  const snapshot = await service.getLatestSnapshot(siteKey);

  return NextResponse.json({
    success: true,
    data: {
      snapshot,
      siteKey
    }
  });
}

export async function POST(
  _request: Request,
  context: any
) {
  const { siteKey } = context.params;
  const service = getService();
  const result = await service.refresh(siteKey);

  return NextResponse.json({
    success: true,
    data: {
      siteKey,
      ...result
    }
  });
}
