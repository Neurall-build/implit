import { ImportInfo } from "./parser.js";
import { CheckResult } from "./checker.js";
import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

// Find package.json exports
function getPackageExports(baseDir: string): Record<string, string[]> {
  const packageJsonPath = path.join(baseDir, "package.json");
  const exports: Record<string, string[]> = {};
  
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      
      // Check "exports" field
      if (pkg.exports) {
        for (const [key, value] of Object.entries(pkg.exports)) {
          if (typeof value === "string") {
            exports[key] = [path.basename(value, path.extname(value))];
          } else if (typeof value === "object") {
            // Handle conditional exports
            const importPath = (value as any).import || (value as any).default;
            if (importPath) {
              exports[key] = [path.basename(importPath, path.extname(importPath))];
            }
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  return exports;
}

// Get exported names from a local file
function getFileExports(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const ext = path.extname(filePath);
  const plugins: any[] = [];
  
  if (ext === ".ts" || ext === ".tsx") {
    plugins.push("typescript");
  }
  if (ext === ".jsx" || ext === ".tsx") {
    plugins.push("jsx");
  }
  
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const ast = parse(content, {
      sourceType: "module",
      plugins: plugins.length > 0 ? plugins : undefined,
    });
    
    const exports: string[] = [];
    
    traverse.default(ast, {
      ExportNamedDeclaration(nodePath: any) {
        const declaration = nodePath.node.declaration;
        if (declaration) {
          if (declaration.type === "FunctionDeclaration" && declaration.id) {
            exports.push(declaration.id.name);
          } else if (declaration.type === "VariableDeclaration") {
            declaration.declarations.forEach((d: any) => {
              if (d.id?.name) {
                exports.push(d.id.name);
              }
            });
          }
        }
        // Handle export { foo, bar }
        if (nodePath.node.specifiers) {
          nodePath.node.specifiers.forEach((s: any) => {
            if (s.exported?.name) {
              exports.push(s.exported.name);
            }
          });
        }
      },
      ExportDefaultDeclaration(nodePath: any) {
        exports.push("default");
      },
    });
    
    return exports;
  } catch {
    return [];
  }
}

// Resolve a local import path
function resolveLocalImport(importPath: string, fromFile: string): string | null {
  const dir = path.dirname(fromFile);
  let resolved = path.resolve(dir, importPath);
  
  // Try common extensions
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
  
  for (const ext of extensions) {
    const withExt = resolved + ext;
    if (fs.existsSync(withExt)) {
      return withExt;
    }
  }
  
  // Try index files
  for (const ext of extensions) {
    const indexFile = path.join(resolved, `index${ext}`);
    if (fs.existsSync(indexFile)) {
      return indexFile;
    }
  }
  
  return null;
}

export async function checkLocalImports(
  imports: ImportInfo[],
  filePath: string
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const absoluteFilePath = path.resolve(filePath);
  const baseDir = path.dirname(absoluteFilePath);
  
  // Get package.json exports if available
  const packageExports = getPackageExports(baseDir);
  
  for (const imp of imports) {
    if (!imp.isLocal) {
      continue;
    }
    
    // Check if the file exists
    const resolvedPath = resolveLocalImport(imp.module, absoluteFilePath);
    
    if (!resolvedPath) {
      results.push({
        import: imp,
        valid: false,
        message: "Local file not found",
      });
      continue;
    }
    
    // If specifiers are imported, verify they exist
    if (imp.specifiers.length > 0) {
      const fileExports = getFileExports(resolvedPath);
      const missing = imp.specifiers.filter(s => !fileExports.includes(s));
      
      if (missing.length > 0) {
        results.push({
          import: imp,
          valid: false,
          message: `Missing exports: ${missing.join(", ")}. Available: ${fileExports.slice(0, 5).join(", ")}${fileExports.length > 5 ? "..." : ""}`,
        });
        continue;
      }
    }
    
    results.push({
      import: imp,
      valid: true,
      message: "Local file exists",
    });
  }
  
  return results;
}