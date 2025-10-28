import { execa } from 'execa';

export async function startServer({ cwd = process.cwd(), env = {} } = {}) {
  const child = execa('node', ['server.js', '--stdio'], {
    cwd,
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'pipe'
  });
  // Avoid unhandled rejection when we terminate the child
  // eslint-disable-next-line promise/catch-or-return
  child.catch(() => {});

  let id = 1;

  async function call(method, params = {}) {
    const req = JSON.stringify({ jsonrpc: '2.0', id: id++, method, params }) + '\n';
    child.stdin.write(req);
    const { value } = await readLine(child.stdout);
    const msg = JSON.parse(value);
    if (msg.error) throw new Error(`${method} -> ${JSON.stringify(msg.error)}`);
    return msg.result || msg; // return result payload by default
  }

  async function initialize() {
    return call('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'vaultmesh-tests', version: '0.0.0' }
    });
  }

  async function callTool(name, args = {}) {
    return call('tools/call', { name, arguments: args });
  }

  async function stop() {
    try {
      child.stdin.end();
      await child.catch(() => {});
    } catch {}
  }

  return { child, call, initialize, callTool, stop };
}

function readLine(stream) {
  return new Promise((resolve, reject) => {
    if (typeof stream.setMaxListeners === 'function') stream.setMaxListeners(0);
    let buf = '';
    function onData(chunk) {
      buf += chunk.toString();
      const nl = buf.indexOf('\n');
      if (nl !== -1) {
        stream.off('data', onData);
        resolve({ value: buf.slice(0, nl) });
      }
    }
    function onError(err) {
      stream.off('data', onData);
      reject(err);
    }
    stream.on('data', onData);
    stream.once('error', onError);
  });
}
