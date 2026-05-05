export type Hex = `0x${string}`;

export type TransferOptions = {
  to: Hex;
  amount: bigint;
  data?: Hex;
};

export interface Receipt {
  hash: Hex;
  status: 'success' | 'reverted';
}

export enum ErrorCode {
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  Reverted = 'REVERTED',
}

export const VERSION = '1.0.0';

export function transfer(opts: TransferOptions): Promise<Receipt> {
  return Promise.resolve({ hash: '0x' as Hex, status: 'success' });
}

export class TokenClient {
  constructor(private rpcUrl: string) {}

  async balanceOf(addr: Hex): Promise<bigint> {
    return 0n;
  }

  async transfer(opts: TransferOptions): Promise<Receipt> {
    return transfer(opts);
  }

  private cache = new Map<string, bigint>();
}
