# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — build with tsup (ESM output to `dist/`)
- `npm run dev -- <args>` — run in development with tsx (e.g., `npm run dev -- ./README.md`)
- `npm publish` — publish to npm

## Architecture

Single-file TypeScript CLI (`src/index.ts`) runnable via `npx tiktoken-cli`. Uses yargs for argument parsing and the tiktoken WASM library for token counting.

The CLI accepts file and directory paths as positional arguments, or reads from stdin when input is piped and no paths are provided (`cat file.txt | tiktoken-cli`). Directories are walked recursively. Output is a tree with token counts per file and subtotals per directory, using `├──`/`└──` connectors.

Key types and functions:
- `TreeNode` — recursive tree structure holding path, token count, and children
- `buildTree()` — recursively builds the tree from filesystem, counting tokens per file
- `printTree()` — renders the tree with aligned token counts and tree connectors
- `encoding_for_model()` from tiktoken — returns the encoder for a given model name; must call `enc.free()` when done
