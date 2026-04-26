import { CheckResult } from "./checker.js";

export function generateFixPrompt(errors: CheckResult[]): string {
  const lines: string[] = [];
  
  lines.push("The following imports in your code are incorrect:");
  lines.push("");
  
  for (const error of errors) {
    const imp = error.import;
    
    if (imp.isLocal) {
      lines.push(`- "${imp.module}" - ${error.message}`);
      if (imp.specifiers.length > 0) {
        lines.push(`  You tried to import: ${imp.specifiers.join(", ")}`);
      }
    } else {
      lines.push(`- Package "${imp.module}" does not exist on npm.`);
      
      // Suggest alternatives if possible
      const packageName = imp.module.split("/")[0];
      lines.push(`  This appears to be a hallucinated package. Search npm for alternatives to "${packageName}".`);
    }
  }
  
  lines.push("");
  lines.push("Please fix these imports and regenerate the code.");
  
  return lines.join("\n");
}

// For clipboard support (optional, works in terminals that support OSC 52)
export function copyToClipboard(text: string): boolean {
  // Try OSC 52 escape sequence (works in many modern terminals)
  const encoded = Buffer.from(text).toString("base64");
  const sequence = `\x1b]52;c;${encoded}\x07`;
  
  try {
    process.stdout.write(sequence);
    return true;
  } catch {
    return false;
  }
}