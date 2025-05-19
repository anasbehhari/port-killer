export interface ProcessInfo {
    pid: number;
    name: string;
    port: number;
    user?: string;
    command?: string;
}

export interface PortKillerOptions {
    force: boolean;
    list: boolean;
    info: boolean;
    json: boolean;
    verbose: boolean;
    quiet: boolean;
    dryRun: boolean;
    config?: string;
}

export interface Config {
    defaultOptions?: Partial<PortKillerOptions>;
    presets?: {
        [key: string]: number[];
    };
}

export type PortInput = number | string;

export interface PortRange {
    start: number;
    end: number;
}

export interface KillResult {
    success: boolean;
    port: number;
    process?: ProcessInfo;
    error?: string;
} 