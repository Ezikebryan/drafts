const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const devFee = BigInt(process.env.DEV_FEE_WEI || "0");
  const OnDrafts = await hre.ethers.getContractFactory("OnDrafts");
  const onDrafts = await OnDrafts.deploy(devFee);
  await onDrafts.waitForDeployment();
  const address = await onDrafts.getAddress();

  console.log("OnDrafts deployed:", address);

  const network = await hre.ethers.provider.getNetwork();
  const netName = network.chainId === 31337n ? "localhost" 
    : network.chainId === 84532n ? "baseSepolia"
    : network.chainId === 8453n ? "base"
    : "unknown";

  const outPath = "frontend/src/contract-address.json";
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(outPath, "utf8")); } catch (e) {}
  existing[netName] = address;
  fs.mkdirSync("frontend/src", { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  console.log("Wrote", outPath);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
