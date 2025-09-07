# Markdown Viewer

A Next.js application that allows you to browse and view Markdown files from public GitHub repositories in a Notion-like TipTap editor.

## Features

- Browse any public GitHub repository
- List all Markdown files (`.md` and `.markdown`)
- View and edit Markdown files in a rich text editor
- Support for custom branches
- Local editing (changes are not saved back to GitHub)

## Getting Started

### Installation

1. Clone or create the project:
```bash
npm install
```

2. (Optional) Create a `.env.local` file for higher GitHub API rate limits:
```bash
cp .env.local.example .env.local
# Edit .env.local and add your GitHub token
```

### Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter a GitHub repository (e.g., `vercel/next.js`)
2. Optionally specify a branch (defaults to the repo's default branch)
3. Click "Load Files" to fetch all Markdown files
4. Click any file in the sidebar to view it in the editor
5. Edit the content locally (changes won't be saved to GitHub)

## Testing

Try these repositories to test the application:

- `vercel/next.js` - Large repo with many Markdown files
- `facebook/react` - Popular repo with good documentation
- `microsoft/typescript` - Another repo with extensive docs

## API Rate Limits

GitHub's API allows 60 requests per hour for unauthenticated requests. If you hit rate limits:

1. Create a GitHub personal access token at https://github.com/settings/tokens
2. No scopes are needed for public repositories
3. Add it to `.env.local` as `GITHUB_TOKEN=your_token_here`
4. Restart the development server

This increases your rate limit to 5,000 requests per hour.

## Architecture

- **Frontend**: Next.js 14 with App Router and TypeScript
- **Editor**: TipTap with StarterKit for rich text editing
- **Markdown**: Marked.js for Markdown to HTML conversion
- **API**: GitHub REST API via Octokit
- **Styling**: Minimal inline styles, no external CSS framework

## Limitations

- Only works with public GitHub repositories
- No authentication or private repo support
- Changes are local only (no save/commit functionality)
- MDX files are not supported (only `.md` and `.markdown`)