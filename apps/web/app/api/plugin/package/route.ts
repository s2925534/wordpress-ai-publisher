import { NextResponse } from 'next/server';

import { errorResponse } from '@/lib/route-response';
import { PluginPackageService } from '@/server/plugin-package-service';

function getService() {
  return new PluginPackageService();
}

export async function GET() {
  try {
    const service = getService();
    const buffer = await service.readPluginZip();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="publisher-plugin.zip"',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return errorResponse(error, { fallbackMessage: 'Unable to package the WordPress plugin zip.' });
  }
}
