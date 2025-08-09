# md-to-docx-cli

Beautiful, interactive CLI to convert Markdown to DOCX using @mohtasham/md-to-docx.

[![CI](https://github.com/MohtashamMurshid/md-to-docx-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/MohtashamMurshid/md-to-docx-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/md-to-docx-cli.svg)](https://www.npmjs.com/package/md-to-docx-cli)

## Install

```bash
npm install -g md-to-docx-cli
```

## Usage

```bash
# Interactive wizard
md-to-docx --interactive

# Convert a file with options
md-to-docx README.md --toc --type report -o out.docx
```

### Options

- -o, --output: Output file or directory
- -t, --type: document|report (default: document)
- -T, --toc: Insert [TOC] at top if missing
- -r, --rtl: Use RTL direction
- -a, --align: LEFT|RIGHT|CENTER|JUSTIFIED
- -s, --style: Path to JSON style config
- -O, --open: Open the resulting .docx
- -w, --watch: Watch input file and reconvert on change
- -v, --verbose: Verbose logging
- -i, --interactive: Start an interactive wizard
- -C, --compact: Compact UI (reduced summary/spacing)

### Wizard shortcuts

- b or Esc: Back
- c or q: Cancel
- r: Run (on confirm step)
- Enter: Select/continue

### Config file (optional)

Create .mdtodocxrc.json in your working directory, for example:

```json
{
  "documentType": "report",
  "style": {
    "paragraphAlignment": "JUSTIFIED",
    "direction": "LTR"
  }
}
```

### Programmatic usage

For programmatic APIs and advanced styling, see the library:

- @mohtasham/md-to-docx: https://github.com/MohtashamMurshid/md-to-docx

## CI and Release

- CI builds on pushes/PRs to main using Node 18.
- Releases publish to npm when you push a tag like v0.1.0 or manually via the "Release to npm" workflow dispatch.
- Configure the secret NPM_TOKEN in your GitHub repo (Settings → Secrets and variables → Actions → New repository secret) with an npm token that has publish rights.

## Contributing

Issues and PRs are welcome. Before publishing, this package builds TypeScript to dist/ and ships bin/ and dist/ only.

email me at contact@mohtasham.dev

## License

MIT
