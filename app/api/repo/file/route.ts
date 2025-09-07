import { NextRequest, NextResponse } from "next/server";
import { getOctokit } from "@/lib/octokit";

export const runtime = 'nodejs';

interface FileResponse {
  markdown: string;
  sha: string;
  name: string;
  path: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const path = searchParams.get('path');
    const ref = searchParams.get('ref');

    if (!owner || !repo || !path) {
      return NextResponse.json(
        { error: 'owner, repo, and path are required' },
        { status: 400 }
      );
    }

    const octokit = getOctokit();

    const content = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: ref || undefined,
    });

    // Ensure it's a file (not a directory)
    if (Array.isArray(content.data) || content.data.type !== 'file') {
      return NextResponse.json(
        { error: 'Not a file' },
        { status: 400 }
      );
    }

    // Decode base64 content
    const markdown = Buffer.from(content.data.content, 'base64').toString('utf-8');

    const response: FileResponse = {
      markdown,
      sha: content.data.sha,
      name: content.data.name,
      path: content.data.path,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching file:', error);
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    if (error.status === 403) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Consider adding a GITHUB_TOKEN to .env.local' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch file content' },
      { status: 500 }
    );
  }
}