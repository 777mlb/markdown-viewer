import { Octokit } from "octokit";

export function getOctokit() {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    userAgent: 'md-viewer/1.0.0',
  });
}