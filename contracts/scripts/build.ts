#!/usr/bin/env tsx

import { build } from '@tact-lang/compiler';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Build all Tact contracts
 */
async function main() {
    console.log(chalk.blue('🔨 Building Tact contracts...\n'));

    const contracts = ['NftItem', 'NftCollection'];
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

            // Build contract using Tact compiler
            const result = await build({
                name: contractName,
                path: contractPath,
                output: buildDir,
                options: {
                    debug: false,
                },
            });

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
