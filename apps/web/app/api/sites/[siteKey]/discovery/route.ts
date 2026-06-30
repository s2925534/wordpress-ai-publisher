import { NextResponse } from 'next/server';

import { DiscoveryService } from '@/server/discovery-service';
import { errorResponse } from '@/lib/route-response';

function getService() {
  return new DiscoveryService(process.env.CONFIG_DIR ?? './config');
}

export async function GET(
  _request: Request,
  context: any
) {
  try {
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
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  _request: Request,
  context: any
) {
  try {
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
  } catch (error) {
    return errorResponse(error);
  }
}
