import React from "react";
import { render } from "ink";
import meow from "meow";
import { App } from "./ui/App.js";
import { Wizard } from "./ui/Wizard.js";

const cli = meow(
  `
  Usage
    $ md-to-docx <input.md> [options]

  Options
    -o, --output      Output file or directory
    -t, --type        document|report (default: document)
    -T, --toc         Insert [TOC] at top if missing
    -r, --rtl         Use RTL direction
    -a, --align       LEFT|RIGHT|CENTER|JUSTIFIED
    -s, --style       Path to JSON style config
    -O, --open        Open the resulting .docx
    -w, --watch       Watch input file and reconvert on change
    -v, --verbose     Verbose logging
    -i, --interactive Start an interactive wizard
    -C, --compact     Compact UI (reduced summary/spacing)

  Examples
    $ md-to-docx README.md -o out.docx --toc --type report
    $ md-to-docx --interactive
  `,
  {
    importMeta: import.meta,
    flags: {
      output: { type: "string", shortFlag: "o" },
      type: { type: "string", default: "document", shortFlag: "t" },
      toc: { type: "boolean", default: false, shortFlag: "T" },
      rtl: { type: "boolean", default: false, shortFlag: "r" },
      align: { type: "string", shortFlag: "a" },
      style: { type: "string", shortFlag: "s" },
      open: { type: "boolean", default: false, shortFlag: "O" },
      watch: { type: "boolean", default: false, shortFlag: "w" },
      verbose: { type: "boolean", default: false, shortFlag: "v" },
      interactive: { type: "boolean", shortFlag: "i", default: false },
      compact: { type: "boolean", shortFlag: "C", default: false },
    },
  }
);

const shouldUseWizard =
  Boolean((cli.flags as any).interactive) || !cli.input[0];

render(
  shouldUseWizard ? (
    <Wizard initialInputPath={cli.input[0]} initialFlags={cli.flags as any} />
  ) : (
    <App inputPath={cli.input[0]} flags={cli.flags as any} />
  )
);
