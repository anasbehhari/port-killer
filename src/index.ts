#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import Conf from 'conf';
import inquirer from 'inquirer';
import ora from 'ora';
import { KillResult, PortKillerOptions, ProcessInfo } from './types.js';
import { findProcessByPort, getAllActivePorts, killProcess } from './utils/process.js';

const program = new Command();
const config = new Conf<{ presets: Record<string, number[]> }>({
    projectName: 'kp-node',
    defaults: {
        presets: {}
    }
});

program
    .name('kp')
    .description(chalk.blue('Port Killer - A friendly CLI tool to manage processes on your ports'))
    .version('1.0.0')
    .addHelpText('after', `
${chalk.yellow('Examples:')}
  $ kp 3000                    Kill process on port 3000
  $ kp 3000,3001              Kill processes on ports 3000 and 3001
  $ kp 3000-3010              Kill processes on ports 3000 through 3010
  $ kp scan                   Show all active ports
  $ kp watch 3000             Watch port 3000 and kill if process starts
  $ kp save dev 3000,3001     Save ports 3000,3001 as preset named "dev"
  $ kp load dev               Load and kill ports from "dev" preset

${chalk.yellow('Common Options:')}
  -f, --force                 Kill without confirmation
  -l, --list                  Show all running ports before/after
  -i, --info                  Show detailed process information
  -j, --json                  Output in JSON format
  -v, --verbose              Show detailed logs
  -q, --quiet                Suppress all output except errors
  -d, --dry-run              Show what would be killed without killing
`);

// Basic usage
program
    .argument('[ports]', 'Port(s) to kill. Can be:\n  • Single port (e.g., 3000)\n  • Multiple ports (e.g., 3000,3001)\n  • Port range (e.g., 3000-3010)')
    .option('-f, --force', 'Kill processes without asking for confirmation')
    .option('-l, --list', 'Show all running ports before and after the operation')
    .option('-i, --info', 'Display detailed information about processes before killing them')
    .option('-j, --json', 'Output results in JSON format (useful for scripting)')
    .option('-v, --verbose', 'Show detailed logs during execution')
    .option('-q, --quiet', 'Suppress all output except errors')
    .option('-d, --dry-run', 'Show what would be killed without actually killing anything')
    .option('-c, --config <path>', 'Use a custom configuration file')
    .action(async (ports: string | undefined, options: PortKillerOptions) => {
        // If no ports provided, show help
        if (!ports) {
            program.help();
            return;
        }

        try {
            const portList = parsePorts(ports);

            if (options.list) {
                await listActivePorts(options);
            }

            const results = await killPorts(portList, options);

            if (options.json) {
                console.log(JSON.stringify(results, null, 2));
            } else {
                displayResults(results, options);
            }

            if (options.list) {
                await listActivePorts(options);
            }
        } catch (error: any) {
            console.error(chalk.red('Error:'), error.message);
            process.exit(1);
        }
    });

// Watch mode
program
    .command('watch')
    .description('Monitor a port and automatically kill any process that starts using it')
    .argument('<port>', 'The port number to watch (e.g., 3000)')
    .option('-i, --interval <ms>', 'How often to check the port (in milliseconds)', '1000')
    .action(async (port: string, options: { interval: string }) => {
        const portNum = parseInt(port, 10);
        if (isNaN(portNum)) {
            console.error(chalk.red('Error:'), 'Invalid port number');
            process.exit(1);
        }

        console.log(chalk.blue(`Watching port ${portNum}...`));

        while (true) {
            const process = await findProcessByPort(portNum);
            if (process) {
                console.log(chalk.yellow(`Process found on port ${portNum}:`));
                console.log(`PID: ${process.pid}`);
                console.log(`Name: ${process.name}`);

                const { confirm } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Kill this process?',
                    default: true
                }]);

                if (confirm) {
                    await killProcess(process.pid);
                    console.log(chalk.green(`Process killed successfully`));
                }
            }

            await new Promise(resolve => setTimeout(resolve, parseInt(options.interval, 10)));
        }
    });

// Scan command
program
    .command('scan')
    .description('Scan your system for all active ports and display them in a readable format')
    .option('-j, --json', 'Output the scan results in JSON format')
    .action(async (options: { json: boolean }) => {
        const spinner = ora('Scanning ports...').start();
        const processes = await getAllActivePorts();
        spinner.stop();

        if (options.json) {
            console.log(JSON.stringify(processes, null, 2));
        } else {
            displayProcessList(processes);
        }
    });

// Preset commands
program
    .command('save')
    .description('Save a combination of ports as a named preset for quick access later')
    .argument('<name>', 'Name for your preset (e.g., "dev" or "production")')
    .argument('<ports>', 'Port(s) to save in the preset (e.g., 3000,3001 or 3000-3010)')
    .action((name: string, ports: string) => {
        const portList = parsePorts(ports);
        const presets = config.get('presets');
        presets[name] = portList;
        config.set('presets', presets);
        console.log(chalk.green(`Preset "${name}" saved successfully`));
    });

program
    .command('load')
    .description('Load and execute a previously saved preset of ports')
    .argument('<name>', 'Name of the preset to load (e.g., "dev" or "production")')
    .action(async (name: string) => {
        const presets = config.get('presets');
        const ports = presets[name];

        if (!ports) {
            console.error(chalk.red('Error:'), `Preset "${name}" not found`);
            process.exit(1);
        }

        const results = await killPorts(ports, program.opts());
        displayResults(results, program.opts());
    });

// Helper functions
function parsePorts(input: string): number[] {
    const ports = new Set<number>();

    // Handle comma-separated ports
    const parts = input.split(',');

    for (const part of parts) {
        if (part.includes('-')) {
            // Handle port range
            const [start, end] = part.split('-').map(p => parseInt(p.trim(), 10));
            if (isNaN(start) || isNaN(end) || start > end) {
                throw new Error(`Invalid port range: ${part}`);
            }
            for (let port = start; port <= end; port++) {
                ports.add(port);
            }
        } else {
            // Handle single port
            const port = parseInt(part.trim(), 10);
            if (isNaN(port)) {
                throw new Error(`Invalid port number: ${part}`);
            }
            ports.add(port);
        }
    }

    return Array.from(ports);
}

async function killPorts(ports: number[], options: PortKillerOptions): Promise<KillResult[]> {
    const results: KillResult[] = [];
    const spinner = options.quiet ? null : ora('Processing ports...').start();

    for (const port of ports) {
        if (spinner) {
            spinner.text = `Processing port ${port}...`;
        }

        const process = await findProcessByPort(port);

        if (!process) {
            results.push({
                success: false,
                port,
                error: 'No process found'
            });
            continue;
        }

        if (options.info) {
            console.log(chalk.yellow('\nProcess Information:'));
            console.log(`Port: ${process.port}`);
            console.log(`PID: ${process.pid}`);
            console.log(`Name: ${process.name}`);
            if (process.command) {
                console.log(`Command: ${process.command}`);
            }
        }

        if (options.dryRun) {
            results.push({
                success: true,
                port,
                process
            });
            continue;
        }

        if (!options.force) {
            const { confirm } = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: `Kill process ${process.pid} (${process.name}) on port ${port}?`,
                default: true
            }]);

            if (!confirm) {
                results.push({
                    success: false,
                    port,
                    process,
                    error: 'Operation cancelled by user'
                });
                continue;
            }
        }

        const success = await killProcess(process.pid);
        results.push({
            success,
            port,
            process,
            error: success ? undefined : 'Failed to kill process'
        });
    }

    if (spinner) {
        spinner.succeed('Port processing complete');
    }

    return results;
}

function displayResults(results: KillResult[], options: PortKillerOptions) {
    if (options.quiet) return;

    console.log('\nResults:');
    for (const result of results) {
        if (result.success) {
            console.log(chalk.green(`✓ Port ${result.port}: Process killed successfully`));
        } else {
            console.log(chalk.red(`✗ Port ${result.port}: ${result.error}`));
        }
    }
}

async function listActivePorts(options: PortKillerOptions) {
    if (options.quiet) return;

    const spinner = ora('Scanning active ports...').start();
    const processes = await getAllActivePorts();
    spinner.stop();

    displayProcessList(processes);
}

function displayProcessList(processes: ProcessInfo[]) {
    if (processes.length === 0) {
        console.log(chalk.yellow('No active ports found'));
        return;
    }

    console.log('\nActive Ports:');
    console.log('-------------');

    for (const process of processes) {
        console.log(chalk.blue(`Port ${process.port}:`));
        console.log(`  PID: ${process.pid}`);
        console.log(`  Name: ${process.name}`);
        if (process.command) {
            console.log(`  Command: ${process.command}`);
        }
        console.log('-------------');
    }
}

program.parse(); 