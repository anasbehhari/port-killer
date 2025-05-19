import { exec } from 'child_process';
import { promisify } from 'util';
import { ProcessInfo } from '../types.js';

const execAsync = promisify(exec);

export async function findProcessByPort(port: number): Promise<ProcessInfo | null> {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
            const lines = stdout.split('\n');

            for (const line of lines) {
                if (line.includes(`:${port}`)) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parseInt(parts[parts.length - 1], 10);

                    if (!isNaN(pid)) {
                        const { stdout: taskOutput } = await execAsync(`tasklist /FI "PID eq ${pid}" /NH`);
                        const taskParts = taskOutput.trim().split(/\s+/);
                        const name = taskParts[0];

                        return {
                            pid,
                            name,
                            port,
                            command: line
                        };
                    }
                }
            }
        } else {
            // Unix-like systems (Linux, macOS)
            const { stdout } = await execAsync(`lsof -i :${port} -t -sTCP:LISTEN`);
            const pid = parseInt(stdout.trim(), 10);

            if (!isNaN(pid)) {
                const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o comm=`);
                const name = psOutput.trim();

                return {
                    pid,
                    name,
                    port,
                    command: await getProcessCommand(pid)
                };
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

export async function killProcess(pid: number): Promise<boolean> {
    try {
        if (process.platform === 'win32') {
            await execAsync(`taskkill /F /PID ${pid}`);
        } else {
            await execAsync(`kill -9 ${pid}`);
        }
        return true;
    } catch (error) {
        return false;
    }
}

async function getProcessCommand(pid: number): Promise<string> {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execAsync(`wmic process where ProcessId=${pid} get CommandLine /value`);
            return stdout.trim().split('=')[1] || '';
        } else {
            const { stdout } = await execAsync(`ps -p ${pid} -o command=`);
            return stdout.trim();
        }
    } catch {
        return '';
    }
}

export async function getAllActivePorts(): Promise<ProcessInfo[]> {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execAsync('netstat -ano | findstr LISTENING');
            const processes: ProcessInfo[] = [];

            for (const line of stdout.split('\n')) {
                const match = line.match(/:(\d+)\s+.*LISTENING\s+(\d+)/);
                if (match) {
                    const port = parseInt(match[1], 10);
                    const pid = parseInt(match[2], 10);

                    if (!isNaN(port) && !isNaN(pid)) {
                        const { stdout: taskOutput } = await execAsync(`tasklist /FI "PID eq ${pid}" /NH`);
                        const taskParts = taskOutput.trim().split(/\s+/);
                        const name = taskParts[0];

                        processes.push({
                            pid,
                            name,
                            port,
                            command: line
                        });
                    }
                }
            }

            return processes;
        } else {
            const { stdout } = await execAsync('lsof -i -P -n | grep LISTEN');
            const processes: ProcessInfo[] = [];

            for (const line of stdout.split('\n')) {
                const match = line.match(/\s+(\d+)\s+.*:(\d+)\s+\(LISTEN\)/);
                if (match) {
                    const pid = parseInt(match[1], 10);
                    const port = parseInt(match[2], 10);

                    if (!isNaN(port) && !isNaN(pid)) {
                        const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o comm=`);
                        const name = psOutput.trim();

                        processes.push({
                            pid,
                            name,
                            port,
                            command: await getProcessCommand(pid)
                        });
                    }
                }
            }

            return processes;
        }
    } catch (error) {
        return [];
    }
} 