import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

export type ConversionResult = {
  success: boolean;
  outputUri?: string;
  error?: string;
};

// Check if a conversion can be done natively on-device
export function canConvertNatively(
  fromType: string,
  toType: string,
): boolean {
  const from = fromType.toLowerCase().replace(".", "");
  const to = toType.toLowerCase().replace(".", "");

  // Image formats supported by expo-image-manipulator
  const supportedImageFormats = ["jpg", "jpeg", "png", "webp", "heic", "bmp"];

  if (supportedImageFormats.includes(from) && supportedImageFormats.includes(to)) {
    return true;
  }

  // Text-based formats (pure JS)
  const textFormats = ["txt", "csv", "json", "yaml", "yml", "xml", "md"];
  if (textFormats.includes(from) && textFormats.includes(to)) {
    return true;
  }

  return false;
}

// Native image conversion using expo-image-manipulator
export async function convertImage(
  inputUri: string,
  fromType: string,
  toType: string,
  outputDir: string,
): Promise<ConversionResult> {
  try {
    const to = toType.toLowerCase().replace(".", "");
    const timestamp = Date.now();
    const outputPath = `${outputDir}/converted_${timestamp}.${to}`;

    // Ensure output directory exists
    const dirInfo = await FileSystem.getInfoAsync(outputDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(outputDir, { intermediates: true });
    }

    const result = await ImageManipulator.manipulateAsync(
      inputUri,
      [],
      {
        format: to as ImageManipulator.SaveFormat,
        compress: 1,
      },
    );

    // Move to desired output path
    if (result.uri !== outputPath) {
      await FileSystem.moveAsync({ from: result.uri, to: outputPath });
    }

    return { success: true, outputUri: outputPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Image conversion failed",
    };
  }
}

// Native text format conversion (pure JS)
export async function convertText(
  inputUri: string,
  fromType: string,
  toType: string,
  outputDir: string,
): Promise<ConversionResult> {
  try {
    const from = fromType.toLowerCase().replace(".", "");
    const to = toType.toLowerCase().replace(".", "");
    const timestamp = Date.now();
    const outputPath = `${outputDir}/converted_${timestamp}.${to}`;

    const content = await FileSystem.readAsStringAsync(inputUri);

    let output = content;

    if (from === "json" && to === "csv") {
      output = jsonToCsv(content);
    } else if (from === "csv" && to === "json") {
      output = csvToJson(content);
    } else if (from === "json" && to === "yaml") {
      output = jsonToYaml(content);
    } else if (from === "yaml" && to === "json") {
      output = yamlToJson(content);
    } else if (from === "json" && to === "xml") {
      output = jsonToXml(content);
    } else if (from === "xml" && to === "json") {
      output = xmlToJson(content);
    } else if (from === "md" && to === "txt") {
      output = content.replace(/[#*`_~\[\]]/g, "").replace(/\n{3,}/g, "\n\n");
    } else if (from === "txt" && to === "md") {
      output = content;
    } else {
      // For same-type or unsupported, just copy
      output = content;
    }

    await FileSystem.writeAsStringAsync(outputPath, output);

    return { success: true, outputUri: outputPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Text conversion failed",
    };
  }
}

// Main conversion dispatcher
export async function convertFile(
  inputUri: string,
  fromType: string,
  toType: string,
  outputDir: string,
): Promise<ConversionResult> {
  const from = fromType.toLowerCase().replace(".", "");
  const to = toType.toLowerCase().replace(".", "");

  const imageFormats = ["jpg", "jpeg", "png", "webp", "heic", "bmp"];
  const textFormats = ["txt", "csv", "json", "yaml", "yml", "xml", "md"];

  if (imageFormats.includes(from) && imageFormats.includes(to)) {
    return convertImage(inputUri, from, to, outputDir);
  }

  if (textFormats.includes(from) && textFormats.includes(to)) {
    return convertText(inputUri, from, to, outputDir);
  }

  return {
    success: false,
    error: `Cannot convert ${from} to ${to} natively. This conversion requires a server.`,
  };
}

// ===== Simple format converters (pure JS) =====

function jsonToCsv(json: string): string {
  const data = JSON.parse(json);
  if (!Array.isArray(data) || data.length === 0) return "";
  const keys = Object.keys(data[0]);
  const header = keys.join(",");
  const rows = data.map((row: Record<string, unknown>) =>
    keys.map((k) => {
      const val = row[k];
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(","),
  );
  return [header, ...rows].join("\n");
}

function csvToJson(csv: string): string {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return "[]";
  const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });
  return JSON.stringify(rows, null, 2);
}

function jsonToYaml(json: string): string {
  const data = JSON.parse(json);
  return objectToYaml(data, 0);
}

function objectToYaml(obj: unknown, indent: number): string {
  const spaces = "  ".repeat(indent);
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") return String(obj);
  if (Array.isArray(obj)) {
    return obj.map((item) => `${spaces}- ${objectToYaml(item, indent + 1)}`).join("\n");
  }
  return Object.entries(obj as Record<string, unknown>)
    .map(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        return `${spaces}${key}:\n${objectToYaml(value, indent + 1)}`;
      }
      return `${spaces}${key}: ${objectToYaml(value, indent + 1)}`;
    })
    .join("\n");
}

function yamlToJson(yaml: string): string {
  // Minimal YAML parser for simple key-value structures
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  for (const line of lines) {
    const match = line.match(/^(\s*)(\w+):\s*(.*)$/);
    if (match) {
      const value = match[3];
      if (value) {
        try {
          result[match[2]] = JSON.parse(value);
        } catch {
          result[match[2]] = value;
        }
      }
    }
  }
  return JSON.stringify(result, null, 2);
}

function jsonToXml(json: string): string {
  const data = JSON.parse(json);
  const wrap = (tag: string, content: string) => `<${tag}>${content}</${tag}>`;
  if (typeof data !== "object" || data === null) return wrap("root", String(data));
  const entries = Object.entries(data)
    .map(([key, value]) => {
      if (typeof value === "object") {
        return wrap(key, jsonToXml(JSON.stringify(value)));
      }
      return wrap(key, String(value));
    })
    .join("");
  return wrap("root", entries);
}

function xmlToJson(xml: string): string {
  const result: Record<string, string> = {};
  const regex = /<(\w+)>(.*?)<\/\1>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    if (match[1] && match[2] !== undefined) {
      result[match[1]] = match[2];
    }
  }
  return JSON.stringify(result, null, 2);
}
