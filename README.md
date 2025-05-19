# Port Killer CLI (`kp`)

A powerful Node.js CLI tool that quickly identifies and terminates processes running on specified ports. Perfect for developers and DevOps engineers who need to manage port conflicts efficiently.

## Features

- Kill processes on specific ports with a simple command
- Support for multiple ports and port ranges
- Interactive mode with process information
- Watch mode for automatic port monitoring
- Save and load port combinations as presets
- Cross-platform support (Windows, macOS, Linux)
- JSON output for automation
- Colorful and informative output

## Installation

```bash
npm install -g port-killer
```

## Usage

### Basic Commands

```bash
# Kill a process on a specific port
kp 3000

# Kill processes on multiple ports
kp 3000,3001,3002

# Kill processes in a port range
kp 3000-3010

# Force kill without confirmation
kp 3000 -f

# Show process information before killing
kp 3000 -i

# List all active ports before/after operation
kp 3000 -l

# Output in JSON format
kp 3000 -j

# Dry run (show what would be killed)
kp 3000 -d
```

### Watch Mode

Monitor a port and automatically kill processes that start using it:

```bash
# Watch port 3000
kp watch 3000

# Watch with custom check interval (in milliseconds)
kp watch 3000 -i 5000
```

### Port Scanning

Scan for all active ports on your system:

```bash
# List all active ports
kp scan

# Output scan results in JSON format
kp scan -j
```

### Presets

Save and load port combinations:

```bash
# Save a preset
kp save dev 3000,3001,3002

# Load and execute a preset
kp load dev
```

## Options

- `-f, --force`: Force kill without confirmation
- `-l, --list`: List all running ports before/after operation
- `-i, --info`: Show detailed process information before killing
- `-j, --json`: Output in JSON format
- `-v, --verbose`: Show detailed logs during execution
- `-q, --quiet`: Suppress all output except errors
- `-d, --dry-run`: Show what would be killed without actually killing
- `-c, --config`: Use custom configuration file

## Configuration

The tool can be configured through:

1. Global config file (automatically created)
2. Project-level config (`.kprc` or in `package.json`)
3. Environment variables (`KP_DEFAULT_OPTIONS`)

## Security

- Permission checks before killing system processes
- Warning when attempting to kill critical system ports
- Safeguards against privilege escalation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 