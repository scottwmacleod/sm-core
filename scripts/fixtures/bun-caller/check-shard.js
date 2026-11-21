const shard = process.env.SM_E2E_SHARD ?? "";
if (!/^[12]\/2$/.test(shard)) {
  console.error(`SM_E2E_SHARD is "${shard}", but web-ci was asked for 2 e2e shards`);
  process.exit(1);
}
console.log(`✓ e2e shard ${shard}`);
