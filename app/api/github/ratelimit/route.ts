import { NextResponse } from "next/server";
import { getOctokit } from "@/lib/octokit";

export const runtime = 'nodejs';

interface RateLimitResponse {
  remaining: number;
  limit: number;
  reset: number;
  resetDate: string;
}

export async function GET() {
  try {
    const octokit = getOctokit();
    
    const rateLimit = await octokit.rest.rateLimit.get();
    
    const response: RateLimitResponse = {
      remaining: rateLimit.data.rate.remaining,
      limit: rateLimit.data.rate.limit,
      reset: rateLimit.data.rate.reset,
      resetDate: new Date(rateLimit.data.rate.reset * 1000).toISOString(),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching rate limit:', error);
    
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Unauthorized or insufficient scope. Check GITHUB_TOKEN.' },
        { status: 401 }
      );
    }
    
    if (error.status === 403) {
      return NextResponse.json(
        { error: 'Unauthorized or insufficient scope. Check GITHUB_TOKEN.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch rate limit information' },
      { status: 500 }
    );
  }
}