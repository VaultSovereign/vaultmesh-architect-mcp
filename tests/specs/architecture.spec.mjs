import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJ = path.join(__dirname, '../..');

describe('VaultMesh MCP Digital Twin spec', () => {
  it('parses YAML and conforms to schema', () => {
    const yamlFile = path.join(PROJ, 'specs', 'vaultmesh_mcp_digital_twin.yaml');
    const schemaFile = path.join(PROJ, 'specs', 'schema', 'vaultmesh_mcp_digital_twin.schema.json');
    const doc = YAML.parse(fs.readFileSync(yamlFile, 'utf8'));
    const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const ok = validate(doc);
    if (!ok) {
      // Useful failure dump
      throw new Error('Schema validation failed: ' + JSON.stringify(validate.errors, null, 2));
    }
    expect(doc.name).toBe('vaultmesh_mcp_digital_twin');
    expect(doc.version).toMatch(/^\d+\.\d+\.\d+$/);
    // sanity: at least 3 architectural layers
    expect(Array.isArray(doc.architectural_layers)).toBe(true);
    expect(doc.architectural_layers.length).toBeGreaterThanOrEqual(3);
  });
});
