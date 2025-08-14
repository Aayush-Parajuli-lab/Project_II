import { spawn } from 'child_process';
import path from 'path';

export function predictWithPython(historicalData, daysAhead = 1) {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.resolve(process.cwd(), 'backend/ml/forest_predictor.py');
      const input = JSON.stringify({ historicalData, daysAhead });
      const py = spawn('python3', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

      let stdout = '';
      let stderr = '';
      py.stdout.on('data', (d) => { stdout += d.toString(); });
      py.stderr.on('data', (d) => { stderr += d.toString(); });

      py.on('close', (code) => {
        if (code !== 0) {
          return resolve({ success: false, error: `Python exited with ${code}`, details: stderr.trim() });
        }
        try {
          const parsed = JSON.parse(stdout);
          return resolve({ success: true, ...parsed });
        } catch (e) {
          return resolve({ success: false, error: 'Invalid JSON from Python', details: stdout });
        }
      });

      py.stdin.write(input);
      py.stdin.end();
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}