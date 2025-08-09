import React, { useCallback, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { App, type Flags } from "./App.js";
import { FilePicker } from "./FilePicker.js";

export function Wizard({
  initialInputPath,
  initialFlags,
}: {
  initialInputPath?: string;
  initialFlags: Flags;
}) {
  const stepOrder = [
    "welcome",
    "pickType",
    "toc",
    "rtl",
    "align",
    "style",
    "output",
    "watch",
    "verbose",
    "open",
    "confirm",
    "run",
  ] as const;

  type Step = (typeof stepOrder)[number];
  const [step, setStep] = useState<Step>("welcome");

  const [inputPath, setInputPath] = useState(initialInputPath ?? "");
  const [flags, setFlags] = useState<Flags>({ ...initialFlags });

  const setFlag = useCallback(
    <K extends keyof Flags>(key: K, value: Flags[K]) => {
      setFlags((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const next = useCallback((s: typeof step) => setStep(s), []);

  const goPrev = useCallback(() => {
    const idx = stepOrder.indexOf(step);
    const prev = stepOrder[Math.max(0, idx - 1)];
    setStep(prev);
  }, [step]);

  const progress = useMemo(() => {
    const idx = stepOrder.indexOf(step);
    const total = stepOrder.length - 1; // exclude "run" from display
    const visibleIdx = Math.min(idx + 1, total);
    return { current: visibleIdx, total };
  }, [step]);

  const withNav = useCallback(
    (
      items: Array<{ label: string; value: any; key?: string }>,
      onSelect: (item: any) => void
    ) => (
      <SelectInput
        items={
          [
            { label: "↩ Back", value: "__nav_back__", key: "nav:back" },
            { label: "✖ Cancel", value: "__nav_cancel__", key: "nav:cancel" },
            ...items,
          ] as any
        }
        onSelect={(item: any) => {
          if (item.value === "__nav_back__") return goPrev();
          if (item.value === "__nav_cancel__") return setStep("welcome");
          onSelect(item);
        }}
      />
    ),
    [goPrev]
  );

  const Summary = () => (
    <Box flexDirection="column" marginLeft={2} width={40}>
      <Text color="gray">Summary</Text>
      <Text>
        Input: <Text color="cyan">{inputPath || "(none)"}</Text>
      </Text>
      <Text>Type: {flags.type ?? "document"}</Text>
      <Text>TOC: {flags.toc ? "Yes" : "No"}</Text>
      <Text>RTL: {flags.rtl ? "Yes" : "No"}</Text>
      <Text>Align: {flags.align ?? "(default)"}</Text>
      <Text>Style: {flags.style ?? "(none)"}</Text>
      <Text>Output: {flags.output ?? "(auto)"}</Text>
      <Text>Watch: {flags.watch ? "Yes" : "No"}</Text>
      <Text>Verbose: {flags.verbose ? "Yes" : "No"}</Text>
      <Text>Open: {flags.open ? "Yes" : "No"}</Text>
    </Box>
  );

  // Keyboard shortcuts: b/esc to back, c/q to cancel, r to run on confirm
  useInput((input, key) => {
    if (key.escape || input.toLowerCase() === "b") {
      return goPrev();
    }
    if (input.toLowerCase() === "c" || input.toLowerCase() === "q") {
      return setStep("welcome");
    }
    if (input.toLowerCase() === "r" && step === "confirm") {
      return next("run");
    }
  });

  const itemsType = useMemo(
    () => [
      { label: "Document (default)", value: "document", key: "type:document" },
      { label: "Report", value: "report", key: "type:report" },
    ],
    []
  );

  const itemsYesNo = useMemo(
    () => [
      { label: "Yes", value: true, key: "yn:yes" },
      { label: "No", value: false, key: "yn:no" },
    ],
    []
  );

  const itemsAlign = useMemo(
    () => [
      { label: "LEFT", value: "LEFT", key: "align:left" },
      { label: "RIGHT", value: "RIGHT", key: "align:right" },
      { label: "CENTER", value: "CENTER", key: "align:center" },
      { label: "JUSTIFIED", value: "JUSTIFIED", key: "align:justified" },
      { label: "Skip (use default)", value: undefined, key: "align:skip" },
    ],
    []
  );

  if (step === "welcome") {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Gradient name="atlas">
          <BigText text="md-to-docx" font="simple" />
        </Gradient>
        <Text color="gray">Convert Markdown to DOCX with style</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Pick a Markdown file</Text>
          <FilePicker
            initialPath={inputPath}
            onSubmit={(fullPath) => {
              setInputPath(fullPath);
              next("pickType");
            }}
          />
          <Box marginTop={1}>
            <Text color="gray">Use ↑/↓ to navigate, Enter to select.</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (step === "pickType") {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Box flexDirection="column">
          <Text>
            Step {progress.current}/{progress.total}: Select document type
          </Text>
          {withNav(itemsType as any, (item: any) => {
            setFlag("type", item.value as any);
            next("toc");
          })}
        </Box>
        {!flags.compact && <Summary />}
      </Box>
    );
  }

  if (step === "toc") {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Box flexDirection="column">
          <Text>
            Step {progress.current}/{progress.total}: Insert [TOC] if missing?
          </Text>
          {withNav(itemsYesNo as any, (item: any) => {
            setFlag("toc", item.value as any);
            next("rtl");
          })}
        </Box>
        {!flags.compact && <Summary />}
      </Box>
    );
  }

  if (step === "rtl") {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Box flexDirection="column">
          <Text>
            Step {progress.current}/{progress.total}: Use RTL?
          </Text>
          {withNav(itemsYesNo as any, (item: any) => {
            setFlag("rtl", item.value as any);
            next("align");
          })}
        </Box>
        {!flags.compact && <Summary />}
      </Box>
    );
  }

  if (step === "align") {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Box flexDirection="column">
          <Text>
            Step {progress.current}/{progress.total}: Paragraph alignment
          </Text>
          {withNav(itemsAlign as any, (item: any) => {
            setFlag("align", item.value as any);
            next("style");
          })}
        </Box>
        {!flags.compact && <Summary />}
      </Box>
    );
  }

  if (step === "style") {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Box flexDirection="column">
          <Text>
            Step {progress.current}/{progress.total}: Style JSON (optional)
          </Text>
          <TextInput
            value={flags.style ?? ""}
            onChange={(v) => setFlag("style", v || undefined)}
            onSubmit={() => next("output")}
            placeholder="./style.json"
          />
          <Box marginTop={1}>
            <Text color="gray">Leave empty and press Enter to skip.</Text>
            <Text color="gray">Type ":back" and Enter to go back.</Text>
          </Box>
        </Box>
        {!flags.compact && <Summary />}
      </Box>
    );
  }

  if (step === "output") {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Box flexDirection="column">
          <Text>
            Step {progress.current}/{progress.total}: Output path
          </Text>
          <TextInput
            value={flags.output ?? ""}
            onChange={(v) => setFlag("output", v || undefined)}
            onSubmit={() => next("watch")}
            placeholder="out.docx or ./dist/"
          />
          <Box marginTop={1}>
            <Text color="gray">Leave empty and press Enter to auto-name.</Text>
          </Box>
        </Box>
        {!flags.compact && <Summary />}
      </Box>
    );
  }

  if (step === "watch") {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Box flexDirection="column">
          <Text>
            Step {progress.current}/{progress.total}: Watch for changes?
          </Text>
          {withNav(itemsYesNo as any, (item: any) => {
            setFlag("watch", item.value as any);
            next("verbose");
          })}
        </Box>
        {!flags.compact && <Summary />}
      </Box>
    );
  }

  if (step === "verbose") {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Box flexDirection="column">
          <Text>
            Step {progress.current}/{progress.total}: Verbose logging?
          </Text>
          {withNav(itemsYesNo as any, (item: any) => {
            setFlag("verbose", item.value as any);
            next("open");
          })}
        </Box>
        {!flags.compact && <Summary />}
      </Box>
    );
  }

  if (step === "open") {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Box flexDirection="column">
          <Text>
            Step {progress.current}/{progress.total}: Open when done?
          </Text>
          {withNav(itemsYesNo as any, (item: any) => {
            setFlag("open", item.value as any);
            next("confirm");
          })}
        </Box>
        <Summary />
      </Box>
    );
  }

  if (step === "confirm") {
    return (
      <Box flexDirection="row" paddingX={1}>
        <Box flexDirection="column">
          <Text color="green">Ready to convert</Text>
          <Text>
            Input: <Text color="cyan">{inputPath || "(none)"}</Text>
          </Text>
          <Text>Type: {flags.type ?? "document"}</Text>
          <Text>TOC: {flags.toc ? "Yes" : "No"}</Text>
          <Text>RTL: {flags.rtl ? "Yes" : "No"}</Text>
          <Text>Align: {flags.align ?? "(default)"}</Text>
          <Text>Style: {flags.style ?? "(none)"}</Text>
          <Text>Output: {flags.output ?? "(auto)"}</Text>
          <Text>Open: {flags.open ? "Yes" : "No"}</Text>
          <Box marginTop={1}>
            <Text color="yellow">Press Enter to run, or Ctrl+C to exit.</Text>
            <Text color="gray">Shortcuts: b/esc=Back, c/q=Cancel, r=Run</Text>
          </Box>
          <TextInput
            value=""
            onChange={() => {}}
            onSubmit={() => next("run")}
          />
        </Box>
        {!flags.compact && <Summary />}
      </Box>
    );
  }

  return <App inputPath={inputPath} flags={flags} />;
}
