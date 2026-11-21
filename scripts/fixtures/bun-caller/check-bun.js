import pkg from "./package.json";

const want = pkg.packageManager.replace(/^bun@/, "").split("+")[0];
if (Bun.version !== want) {
  console.error(`Bun ${Bun.version} is running, but packageManager asks for ${want}`);
  process.exit(1);
}
console.log(`✓ Bun ${Bun.version}, as packageManager asks`);
