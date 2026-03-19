#!/usr/bin/env node

// src/index.ts
import { readFileSync, statSync, readdirSync } from "fs";
import { join, basename, resolve, relative, sep } from "path";
import { encoding_for_model } from "tiktoken";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
function toPortablePath(path) {
  return path.split(sep).join("/");
}
function stripLeadingSlash(path) {
  if (path.startsWith("/")) {
    return path.slice(1);
  }
  return path;
}
function globToRegExp(glob) {
  const escaped = glob.replace(/([.+^${}()|[\]\\])/g, "\\$1").replace(/\*\*/g, "__DOUBLE_STAR__").replace(/\*/g, "[^/]*").replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`);
}
function compileExcludePatterns(patterns) {
  return patterns.map((pattern) => String(pattern).trim()).filter((pattern) => pattern.length > 0).map((pattern) => {
    const anchored = pattern.startsWith("/") || pattern.startsWith("./") || pattern.startsWith("../");
    const normalized = stripLeadingSlash(pattern).replace(/^\.\//, "");
    return {
      anchored,
      regex: globToRegExp(toPortablePath(normalized))
    };
  });
}
function isExcluded(absPath, cwd, excludePatterns) {
  if (excludePatterns.length === 0) {
    return false;
  }
  const relPath = toPortablePath(relative(cwd, absPath));
  for (const pattern of excludePatterns) {
    if (pattern.anchored) {
      if (pattern.regex.test(relPath)) {
        return true;
      }
      continue;
    }
    if (pattern.regex.test(relPath)) {
      return true;
    }
    const segments = relPath.split("/");
    for (let i = 1; i < segments.length; i++) {
      const suffix = segments.slice(i).join("/");
      if (pattern.regex.test(suffix)) {
        return true;
      }
    }
  }
  return false;
}
function buildTree(path, enc, cwd, excludePatterns) {
  const absPath = resolve(path);
  if (isExcluded(absPath, cwd, excludePatterns)) {
    return null;
  }
  const stat = statSync(absPath);
  if (stat.isFile()) {
    try {
      const content = readFileSync(absPath, "utf-8");
      const tokens = enc.encode(content).length;
      return { name: basename(path), path, isDir: false, tokens, children: [] };
    } catch {
      console.error(`Warning: Could not read "${path}", skipping.`);
      return null;
    }
  }
  if (stat.isDirectory()) {
    const entries = readdirSync(absPath, { withFileTypes: true }).sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    const children = [];
    for (const entry of entries) {
      const child = buildTree(join(absPath, entry.name), enc, cwd, excludePatterns);
      if (child) children.push(child);
    }
    const tokens = children.reduce((sum, c) => sum + c.tokens, 0);
    return { name: basename(path) || path, path, isDir: true, tokens, children };
  }
  return null;
}
function printTree(node, maxWidth, prefix, isLast, isRoot) {
  const connector = isRoot ? "" : isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
  const tokenStr = String(node.tokens).padStart(maxWidth);
  if (node.isDir) {
    console.log(`${tokenStr}  ${prefix}${connector}${node.name}/`);
  } else {
    console.log(`${tokenStr}  ${prefix}${connector}${node.name}`);
  }
  if (node.isDir) {
    const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "\u2502   ");
    for (let i = 0; i < node.children.length; i++) {
      const isChildLast = i === node.children.length - 1;
      printTree(node.children[i], maxWidth, childPrefix, isChildLast, false);
    }
  }
}
async function main() {
  const argv = await yargs(hideBin(process.argv)).parserConfiguration({
    "greedy-arrays": false
  }).usage("Usage: tiktoken-cli [options] <paths...>").option("model", {
    alias: "m",
    type: "string",
    default: "gpt-4o",
    describe: "Model to use for tokenization"
  }).option("exclude", {
    type: "string",
    array: true,
    default: [],
    describe: "Exclude files/directories with glob patterns (*, **)"
  }).example("tiktoken-cli ./README.md", "Count tokens in a single file").example("tiktoken-cli ./src/", "Count tokens in all files recursively").example("tiktoken-cli --model gpt-4o ./README.md", "Count tokens using a specific model").example("tiktoken-cli --exclude .github/ ./src/", "Exclude matching paths during recursive scan").example("tiktoken-cli ./README.md ./LICENSE", "Count tokens in multiple files").example("cat file.txt | tiktoken-cli", "Count tokens from stdin").parse();
  const model = argv.model;
  const paths = argv._;
  const excludes = argv.exclude ?? [];
  const compiledExcludes = compileExcludePatterns(excludes);
  const cwd = process.cwd();
  const enc = (() => {
    try {
      return encoding_for_model(model);
    } catch {
      console.error(`Error: Unknown model "${model}".`);
      process.exit(1);
    }
  })();
  if (paths.length === 0) {
    if (process.stdin.isTTY) {
      console.error("You must provide at least one file or directory path, or pipe input via stdin.");
      process.exit(1);
    }
    const content = readFileSync(0, "utf-8");
    const tokens = enc.encode(content).length;
    const maxWidth2 = Math.max(String(tokens).length, 6);
    console.log(`${String(tokens).padStart(maxWidth2)}  <stdin>`);
    console.log();
    console.log(`model: ${model}`);
    enc.free();
    return;
  }
  const trees = [];
  for (const p of paths) {
    try {
      const tree = buildTree(String(p), enc, cwd, compiledExcludes);
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
