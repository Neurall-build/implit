#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { parseImports } from "./parser.js";
import { checkDependencies } from "./checker.js";
import { checkLocalImports } from "./local-checker.js";
import { generateFixPrompt } from "./prompt-generator.js";

const program = new Command();

program
  .name("implit")
  .description("Validate imports and catch fake AI-generated dependencies")
  .version("1.0.0");

program
  .command("check <file>")
  .description("Check a file for hallucinated imports")
  .option("--no-cache", "Disable caching")
  .option("--json", "Output as JSON")
  .option("--fix", "Generate fix prompt for clipboard")
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
        console.log(JSON.stringify(allResults, null, 2));
      }

    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
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
