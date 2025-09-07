import { NextRequest, NextResponse } from "next/server";
import { getOctokit } from "@/lib/octokit";

export const runtime = 'nodejs';

interface CreatePRRequest {
  owner: string;
  repo: string;
  path: string;
  baseBranch?: string;
  baseSha: string;
  markdown: string;
  prTitle?: string;
  prBody?: string;
}

interface CreatePRResponse {
  prUrl: string;
  prNumber: number;
}

interface ConflictResponse {
  error: string;
  upstreamSha: string;
  upstreamMarkdown: string;
}

function createBranchSlug(path: string): string {
  // Create slug from path: replace / with -, remove non-alphanumerics, truncate
  const slug = path
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9\-]/g, '')
    .toLowerCase()
    .substring(0, 40);
  
  // Add timestamp
  const timestamp = new Date().toISOString()
    .replace(/[:\-]/g, '')
    .replace(/\..+/, '')
    .replace('T', '-');
    
  return `docs/${slug}-${timestamp}`;
}

export async function POST(request: NextRequest) {
  let body: CreatePRRequest;
  try {
    body = await request.json();
    const { owner, repo, path, baseBranch, baseSha, markdown, prTitle, prBody } = body;

    if (!owner || !repo || !path || !baseSha || !markdown) {
      return NextResponse.json(
        { error: 'owner, repo, path, baseSha, and markdown are required' },
        { status: 400 }
      );
    }

    const octokit = getOctokit();

    // 1. Resolve base branch
    let resolvedBaseBranch = baseBranch;
    if (!resolvedBaseBranch) {
      const repoData = await octokit.rest.repos.get({ owner, repo });
      resolvedBaseBranch = repoData.data.default_branch;
    }

    // 2. Check for upstream changes (optimistic lock)
    const currentFile = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: resolvedBaseBranch,
    });

    if (Array.isArray(currentFile.data) || currentFile.data.type !== 'file') {
      return NextResponse.json(
        { error: 'Path is not a file' },
        { status: 400 }
      );
    }

    const currentSha = currentFile.data.sha;
    if (currentSha !== baseSha) {
      // Conflict detected - return upstream content
      const upstreamMarkdown = Buffer.from(currentFile.data.content, 'base64').toString('utf-8');
      const conflictResponse: ConflictResponse = {
        error: 'File changed upstream',
        upstreamSha: currentSha,
        upstreamMarkdown,
      };
      return NextResponse.json(conflictResponse, { status: 409 });
    }

    // 3. Get base branch HEAD commit SHA
    const baseBranchRef = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${resolvedBaseBranch}`,
    });
    const baseCommitSha = baseBranchRef.data.object.sha;

    // 4. Create new branch
    const newBranchName = createBranchSlug(path);
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranchName}`,
      sha: baseCommitSha,
    });

    // 5. Update file on new branch
    const commitMessage = `docs: update ${path} via editor`;
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: commitMessage,
      content: Buffer.from(markdown, 'utf-8').toString('base64'),
      branch: newBranchName,
      sha: currentSha,
    });

    // 6. Create pull request
    const prData = await octokit.rest.pulls.create({
      owner,
      repo,
      title: prTitle || `Update ${path}`,
      body: prBody || 'Edited via Notion-like editor',
      head: newBranchName,
      base: resolvedBaseBranch,
    });

    const response: CreatePRResponse = {
      prUrl: prData.data.html_url,
      prNumber: prData.data.number,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error creating PR:', error);
    
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Unauthorized or insufficient scope' },
        { status: 401 }
      );
    }
    
    if (error.status === 403) {
      if (error.response?.headers?.['x-ratelimit-remaining'] === '0' || 
          error.message?.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Unauthorized or insufficient scope' },
        { status: 403 }
      );
    }
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Repo or path not found' },
        { status: 404 }
      );
    }

    if (error.status === 409) {
      return NextResponse.json(
        { error: 'File changed upstream' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create pull request' },
      { status: 500 }
    );
  }
}