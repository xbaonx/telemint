#!/usr/bin/env tsx

import { build } from '@tact-lang/compiler';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import tactConfig from '../tact.config';

/**
 * Build all Tact contracts
 */
async function main() {
  console.log(chalk.blue('🔨 Building Tact contracts...\n'));

  const contracts = ['NftItem', 'NftCollection'];
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const buildDir = path.resolve(__dirname, '../build');

  // Ensure build directory exists
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  for (const contractName of contracts) {
    try {
      console.log(chalk.cyan(`📦 Building ${contractName}...`));

      const contractPath = path.resolve(__dirname, `../${contractName}.tact`);

      if (!fs.existsSync(contractPath)) {
        console.error(chalk.red(`❌ Contract file not found: ${contractPath}`));
        continue;
      }

      // Find project config from tact.config.ts
      const project = tactConfig.projects.find((p) => p.name === contractName);
      if (!project) {
        console.error(chalk.red(`❌ Project config not found for ${contractName}`));
        process.exit(1);
      }

      // Build contract using Tact compiler
      const result = await build({
        ...tactConfig,
        projects: [project],
      });

      if (!result) {
        console.error(chalk.red(`❌ Build failed for ${contractName}, stopping.`));
        process.exit(1);
      }

      console.log(chalk.green(`✅ ${contractName} built successfully!`));

      // Display build artifacts
      const outputPath = path.join(buildDir, `${contractName}.ts`);
      if (fs.existsSync(outputPath)) {
        console.log(chalk.gray(`   Output: ${outputPath}`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error building ${contractName}:`));
      console.error(error);
      process.exit(1);
    }
  }

    console.log(chalk.green('\n✨ All contracts built successfully!'));
    console.log(chalk.gray('\n📁 Build artifacts saved to:'), buildDir);
    console.log(chalk.yellow('\n💡 Next steps:'));
    console.log(chalk.yellow('   1. Review the build output in ./build directory'));
    console.log(chalk.yellow('   2. Deploy NftCollection: pnpm tsx scripts/deploy-collection.ts'));
}

main().catch((error) => {
    console.error(chalk.red('Build failed:'), error);
    process.exit(1);
});
