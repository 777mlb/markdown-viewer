#!/bin/bash
# MCP Bridge for Claude Checkpoints
# Auto-generated for: /Users/matthewbusel/Documents/projects/md-viewer

SERVER_HOST="localhost"
SERVER_PORT="8765"

echo "Claude Checkpoints MCP Bridge connecting to $SERVER_HOST:$SERVER_PORT..." >&2

# Use netcat to bridge stdio to TCP
exec nc "$SERVER_HOST" "$SERVER_PORT"