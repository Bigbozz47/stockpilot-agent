import { NextResponse } from 'next/server';

export interface ApiPayload<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function ok<T>(data: T, status = 200): NextResponse<ApiPayload<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status = 500): NextResponse<ApiPayload<never>> {
  return NextResponse.json({ success: false, error }, { status });
}
