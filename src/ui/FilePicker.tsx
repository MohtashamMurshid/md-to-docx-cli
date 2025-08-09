import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";

// String-encoded values for stable identity and unique keys
// e.g., "dir:src", "file:README.md", "parent", "changeDir", "enterFile", "toggleFilter"
type SelectValue = string;

export function FilePicker({
  initialPath,
  onSubmit,
}: {
  initialPath?: string;
  onSubmit: (filePath: string) => void;
}) {
  const startingDir = useMemo(() => {
    if (initialPath) {
      const parsed = path.parse(initialPath);
      return path.isAbsolute(initialPath)
        ? parsed.dir || process.cwd()
        : path.join(process.cwd(), parsed.dir);
    }
    return process.cwd();
  }, [initialPath]);

  const [currentDir, setCurrentDir] = useState<string>(startingDir);
  const [entries, setEntries] = useState<
    Array<{ label: string; value: SelectValue; key: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [onlyMarkdown, setOnlyMarkdown] = useState(true);
  const [enteringDir, setEnteringDir] = useState(false);
  const [enteringFile, setEnteringFile] = useState(false);
  const [tempPath, setTempPath] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const dirents = await readdir(currentDir, { withFileTypes: true });
      const dirs = dirents
        .filter((d) => d.isDirectory() && !d.name.startsWith("."))
        .map((d) => ({
          label: `📁 ${d.name}/`,
          value: `dir:${d.name}` as SelectValue,
          key: `dir:${d.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const files = dirents
        .filter((d) => d.isFile() && !d.name.startsWith("."))
        .filter((d) =>
          onlyMarkdown ? /\.(md|mdx|markdown)$/i.test(d.name) : true
        )
        .map((d) => ({
          label: `📄 ${d.name}`,
          value: `file:${d.name}` as SelectValue,
          key: `file:${d.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const specials: Array<{
        label: string;
        value: SelectValue;
        key: string;
      }> = [
        {
          label: "⬆️  Parent directory (..)",
          value: "parent",
          key: "special:parent",
        },
        {
          label: `🔎 Change directory...`,
          value: "changeDir",
          key: "special:changeDir",
        },
        {
          label: `✍️  Enter file path...`,
          value: "enterFile",
          key: "special:enterFile",
        },
        {
          label: onlyMarkdown
            ? "🔀 Filter: *.md (on) — toggle to show all"
            : "🔀 Filter: all files (on) — toggle to *.md",
          value: "toggleFilter",
          key: "special:toggleFilter",
        },
      ];

      setEntries([...specials, ...dirs, ...files]);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [currentDir, onlyMarkdown]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (enteringDir) {
    return (
      <Box flexDirection="column">
        <Text>Enter directory path:</Text>
        <TextInput
          value={tempPath}
          onChange={setTempPath}
          onSubmit={() => {
            const next = path.isAbsolute(tempPath)
              ? tempPath
              : path.join(currentDir, tempPath);
            setCurrentDir(next);
            setTempPath("");
            setEnteringDir(false);
          }}
          placeholder="/path/to/directory"
        />
      </Box>
    );
  }

  if (enteringFile) {
    return (
      <Box flexDirection="column">
        <Text>Enter file path:</Text>
        <TextInput
          value={tempPath}
          onChange={setTempPath}
          onSubmit={() => {
            const full = path.isAbsolute(tempPath)
              ? tempPath
              : path.join(currentDir, tempPath);
            setTempPath("");
            setEnteringFile(false);
            onSubmit(full);
          }}
          placeholder="./README.md"
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>
        Current directory: <Text color="cyan">{currentDir}</Text>
      </Text>
      {loading && (
        <Text color="gray">
          <Spinner type="dots" /> Loading...
        </Text>
      )}
      {error && <Text color="red">{error}</Text>}
      <SelectInput
        items={entries as any}
        onHighlight={(item: any) => {
          const v = (item?.value as SelectValue | undefined) ?? "";
          if (v.startsWith("file:")) {
            const name = v.slice("file:".length);
            const full = path.join(currentDir, name);
            readFile(full, "utf8")
              .then((txt) => {
                const lines = txt.split(/\r?\n/).slice(0, 20).join("\n");
                setPreview(lines);
              })
              .catch(() => setPreview(""));
          } else {
            setPreview("");
          }
        }}
        onSelect={(item: any) => {
          const v = item.value as SelectValue;
          if (v.startsWith("dir:")) {
            const name = v.slice("dir:".length);
            setCurrentDir(path.join(currentDir, name));
          } else if (v === "parent") {
            setCurrentDir(path.dirname(currentDir));
          } else if (v === "changeDir") {
            setEnteringDir(true);
          } else if (v === "enterFile") {
            setEnteringFile(true);
          } else if (v === "toggleFilter") {
            setOnlyMarkdown((p) => !p);
          } else if (v.startsWith("file:")) {
            const name = v.slice("file:".length);
            onSubmit(path.join(currentDir, name));
          }
        }}
      />
      {preview && (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
        >
          <Text color="gray">Preview (first 20 lines):</Text>
          <Text>{preview}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="gray">Use ↑/↓ to navigate, Enter to select.</Text>
      </Box>
    </Box>
  );
}
