const flag = process.argv.find((arg) => arg.startsWith("--shard=")) ?? "";
if (!/^--shard=[12]\/2$/.test(flag) || flag !== `--shard=${process.env.SM_E2E_SHARD}`) {
  console.error(`got "${flag}" and SM_E2E_SHARD "${process.env.SM_E2E_SHARD}", but web-ci was asked for 2 e2e shards`);
  process.exit(1);
}
console.log(`✓ e2e ${flag}`);
