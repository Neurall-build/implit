import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

export interface ImportInfo {
  module: string;
  isLocal: boolean;
  isBuiltin: boolean;
  specifiers: string[];
  line?: number;
}

// Node.js built-in modules whitelist
const NODE_BUILTINS = new Set([
  "assert", "buffer", "child_process", "cluster", "console", "constants",
  "crypto", "dgram", "dns", "domain", "events", "fs", "http", "https",
  "module", "net", "os", "path", "perf_hooks", "process", "punycode",
  "querystring", "readline", "repl", "stream", "string_decoder", "sys",
  "timers", "tls", "tty", "url", "util", "v8", "vm", "worker_threads",
  "zlib", "node:test", "test"
]);

function isBuiltin(moduleName: string): boolean {
  const baseName = moduleName.startsWith("node:") 
    ? moduleName.slice(5) 
    : moduleName;
  return NODE_BUILTINS.has(baseName);
}

function isLocal(moduleName: string): boolean {
  return moduleName.startsWith(".") || moduleName.startsWith("/");
}

export async function parseImports(filePath: string): Promise<ImportInfo[]> {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const ext = path.extname(absolutePath).toLowerCase();
  
  const plugins: any[] = [];
  
  if (ext === ".ts" || ext === ".tsx") {
    plugins.push("typescript");
  }
  if (ext === ".jsx" || ext === ".tsx") {
    plugins.push("jsx");
  }

  const ast = parse(content, {
    sourceType: "module",
    plugins: plugins.length > 0 ? plugins : undefined,
  });

  const imports: ImportInfo[] = [];

  traverse.default(ast, {
    ImportDeclaration(nodePath: any) {
      const source = nodePath.node.source.value;
      const specifiers = nodePath.node.specifiers.map((s: any) => 
        s.imported?.name || s.local?.name
      ).filter(Boolean);

      imports.push({
        module: source,
        isLocal: isLocal(source),
        isBuiltin: isBuiltin(source),
        specifiers,
        line: nodePath.node.loc?.start.line,
      });
    },
    CallExpression(nodePath: any) {
      const callee = nodePath.node.callee;
      
      // Handle require('...')
      if (callee.type === "Identifier" && callee.name === "require") {
        const args = nodePath.node.arguments;
        if (args.length > 0 && args[0].type === "StringLiteral") {
          const source = args[0].value;
          imports.push({
            module: source,
            isLocal: isLocal(source),
            isBuiltin: isBuiltin(source),
            specifiers: [],
            line: nodePath.node.loc?.start.line,
          });
        }
      }
      
      // Handle import('...')
      if (callee.type === "Import") {
        const args = nodePath.node.arguments;
        if (args.length > 0 && args[0].type === "StringLiteral") {
          const source = args[0].value;
          imports.push({
            module: source,
            isLocal: isLocal(source),
            isBuiltin: isBuiltin(source),
            specifiers: [],
            line: nodePath.node.loc?.start.line,
          });
        }
      }
    },
  });

  return imports;
}