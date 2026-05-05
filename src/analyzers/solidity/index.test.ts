import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeContracts } from './index.js';

const FOUNDRY_FIXTURE = resolve(__dirname, '../../../tests/fixtures/solidity/foundry-project');
const HARDHAT_FIXTURE = resolve(__dirname, '../../../tests/fixtures/solidity/hardhat-project');

describe('analyzeContracts (foundry)', () => {
  it('reads all artifacts and returns ContractSnapshots', async () => {
    const result = await analyzeContracts(
      { paths: ['src/**/*.sol'], toolchain: 'auto', ignore: [] },
      FOUNDRY_FIXTURE,
    );
    expect(Object.keys(result)).toEqual(['Token']);
    const token = result.Token;
    expect(token.sourcePath).toBe('src/Token.sol');
    expect(token.compilerVersion).toBe('0.8.27+commit.40a35a09');
    expect(token.abi.find((f) => f.name === 'transfer')?.type).toBe('function');
    expect(token.abi.find((f) => f.type === 'constructor')).toBeDefined();
  });

  it('respects the ignore list', async () => {
    const result = await analyzeContracts(
      { paths: ['src/**/*.sol'], toolchain: 'auto', ignore: ['Token'] },
      FOUNDRY_FIXTURE,
    );
    expect(result).toEqual({});
  });

  it('respects the source paths filter', async () => {
    const result = await analyzeContracts(
      { paths: ['nope/**/*.sol'], toolchain: 'auto', ignore: [] },
      FOUNDRY_FIXTURE,
    );
    expect(result).toEqual({});
  });

  it('returns empty when toolchain cannot be detected', async () => {
    const result = await analyzeContracts(
      { paths: ['src/**/*.sol'], toolchain: 'auto', ignore: [] },
      resolve(__dirname),
    );
    expect(result).toEqual({});
  });
});

describe('analyzeContracts (hardhat)', () => {
  it('reads hardhat artifacts via _format/contractName/sourceName', async () => {
    const result = await analyzeContracts(
      { paths: ['contracts/**/*.sol'], toolchain: 'auto', ignore: [] },
      HARDHAT_FIXTURE,
    );
    expect(Object.keys(result)).toEqual(['Token']);
    expect(result.Token.sourcePath).toBe('contracts/Token.sol');
    expect(result.Token.abi[0]?.name).toBe('balanceOf');
  });
});
