import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Simple in-memory cache
const imageCache = new Map<string, { buffer: ArrayBuffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Check cache first
  const cached = imageCache.get(url);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return new NextResponse(cached.buffer, {
      headers: {
        'Content-Type': cached.contentType,
        'X-Cache': 'HIT', // Add a header to indicate cache hit
      },
    });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Store in cache
    imageCache.set(url, { buffer: imageBuffer, contentType, timestamp: Date.now() });

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'X-Cache': 'MISS', // Add a header to indicate cache miss
      },
    });
  } catch (error: any) {
    console.error('[API/image-proxy] ERROR:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}