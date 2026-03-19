# tiktoken-cli

[![tag](https://img.shields.io/github/tag/samber/tiktoken-cli.svg)](https://github.com/samber/tiktoken-cli/releases)
[![npm](https://img.shields.io/npm/v/tiktoken-cli.svg)](https://www.npmjs.com/package/tiktoken-cli)
[![Contributors](https://img.shields.io/github/contributors/samber/tiktoken-cli)](https://github.com/samber/tiktoken-cli/graphs/contributors)
[![License](https://img.shields.io/github/license/samber/tiktoken-cli)](./LICENSE)

**Count tokens in files and directories from your terminal.** Powered by OpenAI's [tiktoken](https://github.com/openai/tiktoken) tokenizer.

Perfect for estimating API costs, checking context window limits, or auditing prompt sizes before sending them to OpenAI, Anthropic, or any LLM provider.

## 🚀 Usage

No install required — just use `npx`:

```bash
# Count tokens in a single file
npx tiktoken-cli ./README.md

# Count tokens in a directory (recursively)
npx tiktoken-cli ./src/

# Exclude a folder or file pattern
npx tiktoken-cli ./src/ --exclude .github/
npx tiktoken-cli --exclude .github/ ./src/
npx tiktoken-cli --exclude .github/ --exclude tsconfig.json ./src/

# Count tokens in multiple files
npx tiktoken-cli ./README.md ./LICENSE ./package.json

# Use a specific model for tokenization
npx tiktoken-cli --model gpt-4o ./README.md

# Count tokens from stdin
cat plop.txt | npx tiktoken-cli --model gpt-4o
echo "Hello world" | npx tiktoken-cli

# Show help
npx tiktoken-cli --help
```

### Output

Single file:

```bash
$ npx tiktoken-cli README.md

   542  ./README.md

model: gpt-4o
```

Stdin:

```bash
$ echo "Hello world" | npx tiktoken-cli

     2  <stdin>

model: gpt-4o
```

Multiple files or directory:

```bash
$ npx tiktoken-cli src/ package*

  1055  src/
  1055  └── index.ts
 22978  package-lock.json
   231  package.json
------
 24264  total

model: gpt-4o
```

## 📦 Install (optional)

If you prefer a global install:

```bash
npm install -g tiktoken-cli
```

Then use it directly:

```bash
tiktoken-cli ./src/
```

## ⚙️ Options

| Flag        | Alias | Default  | Description                                             |
| ----------- | ----- | -------- | ------------------------------------------------------- |
| `--model`   | `-m`  | `gpt-4o` | Model to use for tokenization                           |
| `--exclude` |       | `[]`     | Exclude files/directories with glob patterns (`*`, `**`) |
| `--help`    |       |          | Show help                                               |
| `--version` |       |          | Show version number                                     |

### Exclude patterns

- You can pass `--exclude` multiple times.
- Patterns starting with `/`, `./`, or `../` are treated as anchored paths (relative to your current working directory).
- All other patterns are matched anywhere in the scanned path.
- `*` matches within one path segment, and `**` can match across multiple segments.

Examples:

```bash
# Match by anchored path from current directory
npx tiktoken-cli ./src/ --exclude ./src/generated/**

# Match anywhere in scanned paths
npx tiktoken-cli ./src/ --exclude tsconfig.json
npx tiktoken-cli ./src/ --exclude .github/
npx tiktoken-cli ./src/ --exclude "**/*.md"
```

### Supported models

Any model supported by [tiktoken](https://github.com/openai/tiktoken) works, including:

- `gpt-4o`, `gpt-4o-mini`
- `gpt-4`, `gpt-4-turbo`
- `gpt-3.5-turbo`
- `o1-preview`, `o1-mini`
- And more...

## 🤝 Contributing

- Fork the [project](https://github.com/samber/tiktoken-cli)
- Fix [open issues](https://github.com/samber/tiktoken-cli/issues) or request new features

Don't hesitate ;)

```bash
# Install dependencies
npm install

# Run in development
npx run dev -- ./README.md

# Build
npm run build

# Publish
npm publish
```

## 👤 Contributors

![Contributors](https://contrib.rocks/image?repo=samber/tiktoken-cli)

## 💫 Show your support

Give a ⭐️ if this project helped you!

[![GitHub Sponsors](https://img.shields.io/github/sponsors/samber?style=for-the-badge)](https://github.com/sponsors/samber)

## 📄 License

Copyright © 2026 [Samuel Berthe](https://github.com/samber).

This project is [MIT](./LICENSE) licensed.
