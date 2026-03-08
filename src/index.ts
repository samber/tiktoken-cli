#!/usr/bin/env node

import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { encoding_for_model, type TiktokenModel } from "tiktoken";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  tokens: number;
  children: TreeNode[];
}

function buildTree(path: string, enc: ReturnType<typeof encoding_for_model>): TreeNode | null {
  const stat = statSync(path);

  if (stat.isFile()) {
    try {
      const content = readFileSync(path, "utf-8");
      const tokens = enc.encode(content).length;
      return { name: basename(path), path, isDir: false, tokens, children: [] };
    } catch {
      console.error(`Warning: Could not read "${path}", skipping.`);
      return null;
    }
  }

  if (stat.isDirectory()) {
    const entries = readdirSync(path, { withFileTypes: true })
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    const children: TreeNode[] = [];
    for (const entry of entries) {
      const child = buildTree(join(path, entry.name), enc);
      if (child) children.push(child);
    }

    const tokens = children.reduce((sum, c) => sum + c.tokens, 0);
    return { name: basename(path) || path, path, isDir: true, tokens, children };
  }

  return null;
}

function printTree(node: TreeNode, maxWidth: number, prefix: string, isLast: boolean, isRoot: boolean): void {
  const connector = isRoot ? "" : isLast ? "└── " : "├── ";
  const tokenStr = String(node.tokens).padStart(maxWidth);

  if (node.isDir) {
    console.log(`${tokenStr}  ${prefix}${connector}${node.name}/`);
  } else {
    console.log(`${tokenStr}  ${prefix}${connector}${node.name}`);
  }

  if (node.isDir) {
    const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
    for (let i = 0; i < node.children.length; i++) {
      const isChildLast = i === node.children.length - 1;
      printTree(node.children[i], maxWidth, childPrefix, isChildLast, false);
    }
  }
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .usage("Usage: tiktoken-cli [options] <paths...>")
    .option("model", {
      alias: "m",
      type: "string",
      default: "gpt-4o",
      describe: "Model to use for tokenization",
    })
    .example("tiktoken-cli ./README.md", "Count tokens in a single file")
    .example("tiktoken-cli ./src/", "Count tokens in all files recursively")
    .example("tiktoken-cli --model gpt-4o ./README.md", "Count tokens using a specific model")
    .example("tiktoken-cli ./README.md ./LICENSE", "Count tokens in multiple files")
    .example("cat file.txt | tiktoken-cli", "Count tokens from stdin")
    .parse();

  const model = argv.model as TiktokenModel;
  const paths = argv._ as string[];

  const enc = (() => {
    try {
      return encoding_for_model(model);
    } catch {
      console.error(`Error: Unknown model "${model}".`);
      process.exit(1);
    }
  })();

  // Stdin mode: no paths provided and input is piped
  if (paths.length === 0) {
    if (process.stdin.isTTY) {
      console.error("You must provide at least one file or directory path, or pipe input via stdin.");
      process.exit(1);
    }

    const content = readFileSync(0, "utf-8");
    const tokens = enc.encode(content).length;
    const maxWidth = Math.max(String(tokens).length, 6);
    console.log(`${String(tokens).padStart(maxWidth)}  <stdin>`);
    console.log();
    console.log(`model: ${model}`);
    enc.free();
    return;
  }

  const trees: TreeNode[] = [];

  for (const p of paths) {
    try {
      const tree = buildTree(String(p), enc);
      if (tree) trees.push(tree);
    } catch {
      console.error(`Error: Cannot access "${p}".`);
      process.exit(1);
    }
  }

  if (trees.length === 0) {
    console.error("No files found.");
    process.exit(1);
  }

  const totalTokens = trees.reduce((sum, t) => sum + t.tokens, 0);
  const maxWidth = Math.max(String(totalTokens).length, 6);

  for (const tree of trees) {
    printTree(tree, maxWidth, "", true, true);
  }

  if (trees.length > 1) {
    console.log("-".repeat(maxWidth));
    console.log(`${String(totalTokens).padStart(maxWidth)}  total`);
  }

  console.log();
  console.log(`model: ${model}`);

  enc.free();
}

main();
