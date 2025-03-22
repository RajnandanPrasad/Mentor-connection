const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class PortManager {
  static async findProcessOnPort(port) {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        if (stdout) {
          // Parse the output to find PID
          const lines = stdout.split('\n');
          for (const line of lines) {
            if (line.includes('LISTENING')) {
              const pid = line.trim().split(/\s+/).pop();
              return pid;
            }
          }
        }
      } else {
        // For Unix-based systems
        const { stdout } = await execAsync(`lsof -i :${port} -t`);
        if (stdout) {
          return stdout.trim();
        }
      }
    } catch (error) {
      // Port is likely free
      return null;
    }
    return null;
  }

  static async killProcess(pid) {
    try {
      if (process.platform === 'win32') {
        await execAsync(`taskkill /PID ${pid} /F`);
      } else {
        await execAsync(`kill -9 ${pid}`);
      }
      return true;
    } catch (error) {
      console.error(`Failed to kill process ${pid}:`, error.message);
      return false;
    }
  }

  static async ensurePortAvailable(port) {
    const pid = await this.findProcessOnPort(port);
    if (pid) {
      console.log(`Port ${port} is in use by process ${pid}. Attempting to free it...`);
      const killed = await this.killProcess(pid);
      if (killed) {
        console.log(`Successfully freed port ${port}`);
        // Wait a moment for the port to be fully released
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      } else {
        console.log(`Failed to free port ${port}`);
        return false;
      }
    }
    return true;
  }

  static async findAvailablePort(startPort, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      const port = startPort + i;
      const isAvailable = await this.ensurePortAvailable(port);
      if (isAvailable) {
        return port;
      }
    }
    throw new Error(`Could not find available port after ${maxRetries} attempts`);
  }
}

module.exports = PortManager; 