import { runSmokeCheck } from "../src/smoke.js";

const result = await runSmokeCheck();

process.exitCode = result.exitCode;

if (result.stdout) {
  console.log(result.stdout);
}

if (result.stderr) {
  console.error(result.stderr);
}
