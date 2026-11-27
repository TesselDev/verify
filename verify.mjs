// Checks the Tessel deployment on chain 4663. RPC_URL picks the node; --source <contracts dir> also compares bytecode.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, http, parseAbi } from "viem";

const d = JSON.parse(readFileSync(new URL("./deployment-4663.json", import.meta.url), "utf8"));
const url = process.env.RPC_URL;
if (!url) {
  console.error("Set RPC_URL to a Robinhood Chain (4663) RPC endpoint.");
  process.exit(1);
}
const client = createPublicClient({ transport: http(url) });
const at = process.argv.indexOf("--source");
const source = at > 0 ? process.argv[at + 1] : null;

let failed = 0;
const check = (ok, text) => {
  console.log(`  ${ok ? "✓" : "✗"} ${text}`);
  if (!ok) failed++;
};
const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const abi = parseAbi([
  "function hub() view returns (address)",
  "function isPool(address) view returns (bool)",
  "function usdg() view returns (address)",
  "function vaultImplementation() view returns (address)",
]);
const read = (address, functionName, args) => client.readContract({ address, abi, functionName, args });
const all = { ...d.contracts, ...d.pools };

console.log("Chain");
check((await client.getChainId()) === d.chainId, `RPC answers with chain id ${d.chainId}`);

console.log("Code");
const code = {};
for (const [name, address] of Object.entries(all)) {
  code[name] = (await client.getCode({ address })) ?? "0x";
  check(code[name] !== "0x", `${name} has code at ${address}`);
}

console.log("Links");
for (const name of ["router", "positions", "charters", "credit", "binWethUsdg", "rangeWethUsdg"])
  check(same(await read(all[name], "hub"), d.contracts.hub), `${name} points to the hub`);
for (const [name, address] of Object.entries(d.pools))
  check(await read(d.contracts.hub, "isPool", [address]), `${name} is registered in the hub`);
check(same(await read(d.contracts.credit, "usdg"), d.tokens.USDG), "credit lends USDG");

if (source) {
  console.log(`Runtime bytecode against ${source}`);
  const artifacts = {
    hub: "TesselHub",
    router: "TesselRouter",
    positions: "TesselPositions",
    charters: "TesselCharters",
    credit: "TesselCredit",
    binWethUsdg: "TesselBinPool",
    rangeWethUsdg: "TesselRangePool",
  };
  for (const [name, contract] of Object.entries(artifacts)) {
    const a = JSON.parse(readFileSync(join(source, "out", `${contract}.sol`, `${contract}.json`), "utf8")).deployedBytecode;
    // Immutables are written at deployment: mask them on both sides, compare everything else, metadata hash included.
    const mask = (hex) => {
      const chars = hex.slice(2).toLowerCase().split("");
      for (const refs of Object.values(a.immutableReferences ?? {}))
        for (const { start, length } of refs) chars.fill("0", start * 2, (start + length) * 2);
      return chars.join("");
    };
    check(mask(code[name]) === mask(a.object), `${contract} identical, metadata hash included`);
  }
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
