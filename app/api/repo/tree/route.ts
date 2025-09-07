import { NextRequest, NextResponse } from "next/server";
import { getOctokit } from "@/lib/octokit";

export const runtime = 'nodejs';

interface TreeResponse {
  branch: string;
  files: string[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    let branch = searchParams.get('branch');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'owner and repo are required' },
        { status: 400 }
      );
    }

    const octokit = getOctokit();

    // Get default branch if none provided
    if (!branch) {
      const repoData = await octokit.rest.repos.get({ owner, repo });
      branch = repoData.data.default_branch;
    }

    // Get branch reference to get the commit SHA
    const ref = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    const sha = ref.data.object.sha;

    // Get the tree recursively
    const tree = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: sha,
      recursive: "1",
    });

    // Filter to markdown files only
    const markdownFiles = tree.data.tree
      .filter((item) => 
        item.type === 'blob' && 
        item.path && 
        (item.path.endsWith('.md') || item.path.endsWith('.markdown'))
      )
      .map((item) => item.path!)
      .sort();

    const response: TreeResponse = {
      branch,
      files: markdownFiles,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching tree:', error);
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Repository not found or branch does not exist' },
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
      { error: 'Failed to fetch repository tree' },
      { status: 500 }
    );
  }
}