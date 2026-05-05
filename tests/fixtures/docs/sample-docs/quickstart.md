---
title: Quickstart
---

# Quickstart

Send a transfer:

```ts
import { transfer } from '@example/sample-sdk';

await transfer({ to: '0x0000000000000000000000000000000000000001', amount: 100n });
```

Use the client:

```ts
import { TokenClient } from '@example/sample-sdk';

const client = new TokenClient('https://rpc.example.com');
const balance: bigint = await client.balanceOf('0x0000000000000000000000000000000000000001');
```

A snippet that should not compile (wrong type):

```ts
import { transfer } from '@example/sample-sdk';

await transfer({ to: '0x1', amount: 'not-a-bigint' });
```

A Solidity snippet (captured but not validated in v0.1):

```solidity
contract Example {
    function ping() external pure returns (string memory) {
        return "pong";
    }
}
```
