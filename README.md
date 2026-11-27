# Tessel verify

One command that checks the Tessel deployment on Robinhood Chain (chain 4663).

```bash
git clone https://github.com/TesselDev/verify && cd verify
npm install
RPC_URL=<your 4663 RPC> node verify.mjs
```

## What it checks

| Step | Check |
| --- | --- |
| Chain | The RPC answers with chain id 4663 |
| Code | Each contract and pool has code at its published address |
| Links | Router, positions, charters, credit and both pools point to the hub; both pools are registered; credit lends USDG |
| Bytecode | With `--source`, the runtime code equals the compiled source, metadata hash included |

The script exits with status 1 when any check fails.

## Reproducing the bytecode

```bash
git clone --recurse-submodules https://github.com/TesselDev/contracts ../contracts
(cd ../contracts && forge build)
RPC_URL=<your 4663 RPC> node verify.mjs --source ../contracts
```

Values written at deployment (immutables) are read from the compiled artifact and masked before the comparison.

## License

[MIT](LICENSE)
