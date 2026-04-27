#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { parseImports } from "./parser.js";
import { checkDependencies } from "./checker.js";
import { checkLocalImports } from "./local-checker.js";
import { generateFixPrompt } from "./prompt-generator.js";
import { checkPackageSecurity, runNpmAudit, SecurityIssue } from "./security.js";

const program = new Command();

program
  .name("implit")
  .description("Validate imports and catch fake AI-generated dependencies")
  .version("1.2.0");

program
  .command("check <file>")
  .description("Check a file for hallucinated imports")
  .option("--no-cache", "Disable caching")
  .option("--json", "Output as JSON")
  .option("--fix", "Generate fix prompt for clipboard")
  .option("--security", "Run security checks for vulnerabilities and typosquatting")
  .action(async (file: string, options) => {
    console.log(chalk.blue(`\n🔍 Checking ${file}...\n`));

    try {
      const imports = await parseImports(file);
      
      if (imports.length === 0) {
        console.log(chalk.green("✓ No imports found\n"));
        return;
      }

      const externalImports = imports.filter(i => !i.isLocal);
      const localImports = imports.filter(i => i.isLocal);

      // Check external dependencies
      const externalResults = await checkDependencies(externalImports, options.cache);
      
      // Check local imports
      const localResults = await checkLocalImports(localImports, file);

      // Combine results
      const allResults = [...externalResults, ...localResults];
      const errors = allResults.filter(r => !r.valid);
      const valid = allResults.filter(r => r.valid);

      // Output results
      if (valid.length > 0) {
        valid.forEach(r => {
          console.log(chalk.green(`✓ ${r.import.module}`) + chalk.gray(` - ${r.message}`));
        });
      }

      // Security checks
      let securityIssues: SecurityIssue[] = [];
      if (options.security && externalImports.length > 0) {
        console.log(chalk.blue("\n🔒 Running security checks...\n"));
        
        for (const imp of externalImports.filter(i => !i.isBuiltin)) {
          const issues = await checkPackageSecurity(imp.module);
          securityIssues.push(...issues);
        }

        if (securityIssues.length > 0) {
          securityIssues.forEach(issue => {
            const severityColor = issue.severity === "critical" || issue.severity === "high"
              ? chalk.red
              : issue.severity === "medium"
                ? chalk.yellow
                : chalk.gray;
            
            console.log(severityColor(`⚠️ ${issue.module}`) + chalk.gray(` - ${issue.message}`));
          });
        } else {
          console.log(chalk.green("✓ No security issues found"));
        }
      }

      if (errors.length > 0) {
        console.log("");
        errors.forEach(r => {
          console.log(chalk.red(`✗ ${r.import.module}`) + chalk.gray(` - ${r.message}`));
        });

        if (options.fix) {
          console.log("\n" + chalk.yellow("📋 Fix prompt (copied to clipboard):\n"));
          const prompt = generateFixPrompt(errors);
          console.log(chalk.cyan(prompt));
        }

        console.log("");
        process.exit(1);
      }

      console.log(chalk.green("\n✓ All imports are valid!\n"));
      
      if (options.json) {
        console.log(JSON.stringify({ imports: allResults, security: securityIssues }, null, 2));
      }

    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command("audit")
  .description("Run npm audit for known vulnerabilities")
  .action(async () => {
    console.log(chalk.blue("\n🔒 Running npm audit...\n"));
    
    const issues = await runNpmAudit();
    
    if (issues.length === 0) {
      console.log(chalk.green("✓ No known vulnerabilities found!\n"));
      return;
    }

    issues.forEach(issue => {
      const severityColor = issue.severity === "critical" || issue.severity === "high"
        ? chalk.red
        : issue.severity === "medium"
          ? chalk.yellow
          : chalk.gray;
      
      console.log(severityColor(`⚠️ ${issue.module}`) + chalk.gray(` - ${issue.message}`));
    });

    console.log(chalk.red(`\n✗ Found ${issues.length} vulnerabilities!\n`));
    process.exit(1);
  });

program
  .command("install-hook")
  .description("Install a git pre-commit hook")
  .action(async () => {
    const fs = await import("fs");
    const path = await import("path");
    
    const hookPath = path.join(process.cwd(), ".git", "hooks", "pre-commit");
    const hookContent = `#!/bin/sh
# Implit pre-commit hook
npx @neurall.build/implit check "src/**/*.{ts,tsx,js,jsx}" --security
`;
    
    try {
      // Create .git/hooks directory if needed
      const hooksDir = path.dirname(hookPath);
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }
      
      fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
      console.log(chalk.green("✓ Pre-commit hook installed!\n"));
      console.log(chalk.gray("The hook will run on every commit to validate imports."));
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      console.log(chalk.yellow("\nTip: Make sure you're in a git repository.\n"));
      process.exit(1);
    }
  });

program
  .command("clear-cache")
  .description("Clear the dependency cache")
  .action(async () => {
    const { clearCache } = await import("./cache.js");
    clearCache();
    console.log(chalk.green("✓ Cache cleared\n"));
  });

program.parse();
