import { NextResponse } from 'next/server';

import { settingsUpdateSchema } from '@/lib/settings-schemas';
import { errorResponse } from '@/lib/route-response';
import { SettingsService } from '@/server/settings-service';

function getService() {
  return new SettingsService(process.env.CONFIG_DIR ?? './config');
}

export async function GET() {
  try {
    const service = getService();
    const settings = await service.getSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = settingsUpdateSchema.parse(await request.json());
    const service = getService();
    const settings = await service.updateSettings(body);
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return errorResponse(error);
  }
}
