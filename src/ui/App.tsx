import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import TextInput from "ink-text-input";
import path from "node:path";
import { readFile, writeFile, stat } from "node:fs/promises";
import { watch as watchFile } from "node:fs";
import { convertMarkdownToDocx, type Options } from "@mohtasham/md-to-docx";
import openFile from "open";

export type Flags = {
  output?: string;
  type?: "document" | "report";
  toc?: boolean;
  rtl?: boolean;
  align?: "LEFT" | "RIGHT" | "CENTER" | "JUSTIFIED";
  style?: string;
  open?: boolean;
  watch?: boolean;
  verbose?: boolean;
  compact?: boolean;
};

async function loadJsonIfExists(filePath?: string) {
  if (!filePath) return undefined;
  try {
    const text = await readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return undefined;
    }
    throw new Error(
      `Failed to read or parse JSON: ${filePath}\n${
        err?.message ?? String(err)
      }`
    );
  }
}

async function tryStat(p: string) {
  try {
    return await stat(p);
  } catch {
    return null;
  }
}

export function App({
  inputPath,
  flags,
}: {
  inputPath?: string;
  flags: Flags;
}) {
  const [pathValue, setPathValue] = useState(inputPath ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileWatcherRef = useRef<ReturnType<typeof watchFile> | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const validateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [pathCheckMessage, setPathCheckMessage] = useState<string | null>(null);
  const [pathIsValid, setPathIsValid] = useState<boolean | null>(null);

  const ready = Boolean(pathValue);

  const resolveOutputPath = (inPath: string, desired?: string) => {
    if (!desired) {
      const { dir, name } = path.parse(inPath);
      return path.join(dir, `${name}.docx`);
    }
    return desired.endsWith(path.sep)
      ? path.join(desired, `${path.parse(inPath).name}.docx`)
      : desired;
  };

  const convert = async (inPath: string) => {
    try {
      setBusy(true);
      setError(null);

      setStatus("Validating input path...");
      const st = await tryStat(inPath);
      if (!st || !st.isFile()) {
        throw new Error(`Input not found or not a file: ${inPath}`);
      }

      setStatus("Reading markdown...");
      const markdown = await readFile(inPath, "utf8");

      setStatus("Preparing options...");
      const rc = await loadJsonIfExists(".mdtodocxrc.json");
      const styleFromFile = await loadJsonIfExists(flags.style);

      // Whitelist of style keys by expected type
      const numericStyleKeys = new Set([
        "titleSize",
        "headingSpacing",
        "paragraphSpacing",
        "lineSpacing",
        "heading1Size",
        "heading2Size",
        "heading3Size",
        "heading4Size",
        "heading5Size",
        "paragraphSize",
        "listItemSize",
        "codeBlockSize",
        "blockquoteSize",
        "tocFontSize",
        "tocHeading1FontSize",
        "tocHeading2FontSize",
        "tocHeading3FontSize",
        "tocHeading4FontSize",
        "tocHeading5FontSize",
      ] as const);
      const booleanStyleKeys = new Set([
        "tocHeading1Bold",
        "tocHeading2Bold",
        "tocHeading3Bold",
        "tocHeading4Bold",
        "tocHeading5Bold",
        "tocHeading1Italic",
        "tocHeading2Italic",
        "tocHeading3Italic",
        "tocHeading4Italic",
        "tocHeading5Italic",
      ] as const);
      const stringStyleKeys = new Set([
        "paragraphAlignment",
        "headingAlignment",
        "heading1Alignment",
        "heading2Alignment",
        "heading3Alignment",
        "heading4Alignment",
        "heading5Alignment",
        "blockquoteAlignment",
        "direction",
      ] as const);

      // Provide safe defaults only when user is trying to alter style
      const userWantsCustomStyle =
        Boolean(rc?.style) ||
        Boolean(styleFromFile) ||
        Boolean(flags.align) ||
        Boolean(flags.rtl);

      const defaultNumericStyle: Record<string, number> = userWantsCustomStyle
        ? {
            titleSize: 32,
            headingSpacing: 240,
            paragraphSpacing: 240,
            lineSpacing: 1.15,
            heading1Size: 32,
            heading2Size: 28,
            heading3Size: 24,
            heading4Size: 20,
            heading5Size: 18,
            paragraphSize: 24,
            listItemSize: 24,
            codeBlockSize: 20,
            blockquoteSize: 24,
            tocFontSize: 22,
          }
        : {};

      // Merge and sanitize style to ensure no NaN values reach the library
      const mergedRaw: Record<string, unknown> = {
        ...defaultNumericStyle,
        ...(rc?.style || {}),
        ...(styleFromFile || {}),
        ...(flags.align ? { paragraphAlignment: flags.align } : {}),
        ...(flags.rtl ? { direction: "RTL" } : {}),
      };

      const sanitizedStyleEntries = Object.entries(mergedRaw).filter(
        ([key, value]) => {
          if (numericStyleKeys.has(key as any)) {
            const num =
              typeof value === "string" ? Number(value) : (value as number);
            return Number.isFinite(num);
          }
          if (booleanStyleKeys.has(key as any)) {
            return typeof value === "boolean";
          }
          if (stringStyleKeys.has(key as any)) {
            return typeof value === "string" && value.length > 0;
          }
          return false;
        }
      );

      const sanitizedStyle = Object.fromEntries(
        sanitizedStyleEntries.map(([key, value]) => {
          if (numericStyleKeys.has(key as any)) {
            const num =
              typeof value === "string" ? Number(value) : (value as number);
            return [key, num];
          }
          return [key, value];
        })
      ) as Record<string, unknown>;

      const effectiveMarkdown =
        flags.toc && !markdown.includes("[TOC]")
          ? `\n[TOC]\n\n${markdown}`
          : markdown;

      const options: Options = {
        documentType: (flags.type as any) ?? rc?.documentType ?? "document",
        style:
          userWantsCustomStyle && Object.keys(sanitizedStyle).length
            ? (sanitizedStyle as any)
            : undefined,
      };

      if (flags.verbose) {
        setStatus(
          `Converting to DOCX... (type=${options.documentType}, rtl=${Boolean(
            flags.rtl
          )}, toc=${Boolean(flags.toc)})`
        );
      } else {
        setStatus("Converting to DOCX...");
      }
      const blob = await convertMarkdownToDocx(effectiveMarkdown, options);

      // Compute final output path respecting existing directory
      let outPath = resolveOutputPath(inPath, flags.output);
      if (flags.output) {
        const outStat = await tryStat(flags.output);
        if (outStat?.isDirectory()) {
          const { name } = path.parse(inPath);
          outPath = path.join(flags.output, `${name}.docx`);
        }
      }

      if (flags.verbose) {
        setStatus(`Writing ${outPath}...`);
      } else {
        setStatus("Writing output file...");
      }
      const ab = await blob.arrayBuffer();
      await writeFile(outPath, Buffer.from(ab));

      setStatus(`Done: ${outPath}`);
      if (flags.open) {
        setStatus(`Opening ${outPath}...`);
        await openFile(outPath);
      }

      // Setup watcher after first successful conversion if requested
      if (flags.watch && !fileWatcherRef.current) {
        try {
          fileWatcherRef.current = watchFile(
            inPath,
            { persistent: true },
            () => {
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              debounceTimerRef.current = setTimeout(() => {
                void convert(inPath);
              }, 200);
            }
          );
          setStatus((prev) => `${prev ?? ""}\nWatching for changes...`);
        } catch (watchErr: any) {
          setStatus(null);
          setError(
            `Failed to start file watcher: ${
              watchErr?.message ?? String(watchErr)
            }`
          );
        }
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (inputPath) void convert(inputPath);
    return () => {
      if (fileWatcherRef.current) {
        fileWatcherRef.current.close();
        fileWatcherRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (validateTimerRef.current) {
        clearTimeout(validateTimerRef.current);
        validateTimerRef.current = null;
      }
    };
  }, []);

  // Live input validation feedback for path entry UX
  useEffect(() => {
    if (inputPath) return; // skip live validation when path is provided by CLI/wizard
    if (!pathValue) {
      setPathCheckMessage(null);
      setPathIsValid(null);
      return;
    }
    if (validateTimerRef.current) clearTimeout(validateTimerRef.current);
    validateTimerRef.current = setTimeout(async () => {
      try {
        const st = await tryStat(pathValue);
        if (st?.isFile()) {
          setPathIsValid(true);
          setPathCheckMessage("Looks good. Press Enter to convert.");
        } else if (st) {
          setPathIsValid(false);
          setPathCheckMessage("Path exists but is not a file.");
        } else {
          setPathIsValid(false);
          setPathCheckMessage("File not found.");
        }
      } catch {
        setPathIsValid(false);
        setPathCheckMessage("Unable to access path.");
      }
    }, 200);
  }, [pathValue, inputPath]);

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1} flexDirection="column">
        <Gradient name="atlas">
          <BigText text="md-to-docx" font="simple" />
        </Gradient>
        <Text color="gray">Markdown → DOCX converter</Text>
      </Box>

      {/* Context bar */}
      <Box marginBottom={1}>
        <Text>
          <Text backgroundColor="blue" color="white">
            {" "}
            ⌁{" "}
          </Text>
          <Text color="cyan"> Ready</Text>
          {flags.watch && (
            <Text>
              <Text color="gray"> • </Text>
              <Text backgroundColor="magenta" color="black">
                {" "}
                WATCH{" "}
              </Text>
            </Text>
          )}
          {flags.open && (
            <Text>
              <Text color="gray"> • </Text>
              <Text backgroundColor="green" color="black">
                {" "}
                AUTO-OPEN{" "}
              </Text>
            </Text>
          )}
          {flags.verbose && (
            <Text>
              <Text color="gray"> • </Text>
              <Text backgroundColor="yellow" color="black">
                {" "}
                VERBOSE{" "}
              </Text>
            </Text>
          )}
        </Text>
      </Box>

      {/* Separator */}
      <Box marginY={1}>
        <Text color="gray">
          {"─".repeat(Math.min(process.stdout?.columns ?? 80, 80))}
        </Text>
      </Box>

      {!inputPath && (
        <Box marginBottom={1} flexDirection="column">
          <Text>
            <Text backgroundColor="cyan" color="black">
              {" "}
              INPUT{" "}
            </Text>
            <Text> Enter path to a .md file:</Text>
          </Text>
          <TextInput
            value={pathValue}
            onChange={setPathValue}
            onSubmit={() => void convert(pathValue)}
            placeholder="./README.md"
          />
          {pathCheckMessage && (
            <Text>
              <Text
                backgroundColor={pathIsValid ? "green" : "yellow"}
                color="black"
              >
                {pathIsValid ? " OK " : " INFO "}
              </Text>{" "}
              <Text color={pathIsValid ? "green" : "yellow"}>
                {pathCheckMessage}
              </Text>
            </Text>
          )}
          {!pathValue && (
            <Text color="gray">
              Tip: You can drag a file into the terminal to paste its path.
            </Text>
          )}
        </Box>
      )}

      {busy && (
        <Box marginY={1}>
          <Text>
            <Text backgroundColor="cyan" color="black">
              {" "}
              WORKING{" "}
            </Text>{" "}
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>{" "}
            <Text color="white">{status}</Text>
          </Text>
        </Box>
      )}

      {!busy && status && !error && (
        <Box marginY={1}>
          <Text>
            <Text
              backgroundColor={status.startsWith("Done:") ? "green" : "blue"}
              color={status.startsWith("Done:") ? "black" : "white"}
            >
              {status.startsWith("Done:") ? " DONE " : " INFO "}
            </Text>{" "}
            <Text color={status.startsWith("Done:") ? "green" : "white"}>
              {status}
            </Text>
          </Text>
        </Box>
      )}

      {error && (
        <Box marginY={1}>
          <Text>
            <Text backgroundColor="red" color="white">
              {" "}
              ERROR{" "}
            </Text>{" "}
            <Text color="red">{error}</Text>
          </Text>
        </Box>
      )}

      {!busy && !status && !error && ready && (
        <Text>
          <Text backgroundColor="green" color="black">
            {" "}
            READY{" "}
          </Text>{" "}
          <Text color="green">Press Enter to convert</Text>
        </Text>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text color="gray">
          Press Enter to start • Press Ctrl+C to exit • Flags: --toc{" "}
          {flags.toc ? "on" : "off"}, --rtl {flags.rtl ? "on" : "off"}
        </Text>
      </Box>
    </Box>
  );
}
