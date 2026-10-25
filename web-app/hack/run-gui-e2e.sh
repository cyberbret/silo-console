#!/usr/bin/env bash
# Copyright (c) 2026 Pigsty
# SPDX-License-Identifier: AGPL-3.0-or-later
set -u
set -o pipefail
umask 077

gui_web_root=$(cd -- "$(dirname -- "$0")/.." && pwd)
cd "$gui_web_root" || exit 1
export GUI_E2E_RUN_ID=${GUI_E2E_RUN_ID:-run-$(date +%Y%m%d%H%M%S)-$RANDOM}

discovery=false
baseline=false
visual_only=false
value_for=
for argument in "$@"; do
  if [[ -n $value_for ]]; then
    if [[ $value_for == --max-failures && ! $argument =~ ^[1-9][0-9]*$ ]]; then
      echo "--max-failures requires a positive integer" >&2; exit 2
    fi
    [[ -n $argument ]] || { echo "$value_for requires a value" >&2; exit 2; }
    value_for=
    continue
  fi
  case "$argument" in
    --list) discovery=true ;;
    e2e/visual.spec.ts) visual_only=true ;;
    e2e/navigation.spec.ts|e2e/buckets-table.spec.ts|e2e/preview.spec.ts|e2e/iam.spec.ts|e2e/overview.spec.ts|e2e/a11y.spec.ts|e2e/responsive.spec.ts|e2e/object-keyboard.spec.ts) ;;
    --grep|-g|--max-failures) value_for=$argument ;;
    --grep=?*|-g?*) ;;
    --max-failures=*) [[ ${argument#*=} =~ ^[1-9][0-9]*$ ]] || { echo "--max-failures requires a positive integer" >&2; exit 2; } ;;
    --update-snapshots=all) baseline=true ;;
    *) echo "Unsupported GUI argument: $argument. Only GUI spec paths, --list, --grep and --max-failures are accepted; baseline creation is visual-only." >&2; exit 2 ;;
  esac
done
[[ -z $value_for ]] || { echo "$value_for requires a value" >&2; exit 2; }
if $baseline && { ! $visual_only || [[ ${VISUAL:-0} != 1 || $# != 2 ]]; }; then
  echo "Snapshot creation accepts only VISUAL=1 with e2e/visual.spec.ts --update-snapshots=all" >&2
  exit 2
fi
# Validation runs before creating directories or touching any fixture.
node --input-type=module -e 'import {guiEnvironment} from "./e2e/fixtures/guiEnvironment.ts"; guiEnvironment();' || exit $?
for setting in ENDPOINT ACCESS_KEY SECRET_KEY; do
  case "$setting" in
    ENDPOINT) expected=${CONSOLE_URL:?CONSOLE_URL is required} ;;
    ACCESS_KEY) expected=${GUI_E2E_USERNAME:-} ;;
    SECRET_KEY) expected=${GUI_E2E_PASSWORD:-} ;;
  esac
  variable=CONSOLE_TEST_$setting
  if [[ -n ${!variable:-} && ${!variable} != "$expected" ]]; then
    echo "Conflicting $variable; the GUI runner must use one server and account" >&2
    exit 2
  fi
  export "$variable=$expected"
done
if $discovery; then
  exec yarn exec playwright test --config=playwright.gui.config.ts "$@"
fi
if [[ -z ${GUI_E2E_LOCK_DIR:-} ]]; then
  echo "GUI_E2E_LOCK_DIR must identify one shared external lock directory for this backend" >&2
  exit 2
fi
node --input-type=module -e 'import {externalDirectory,guiEnvironment} from "./e2e/fixtures/guiEnvironment.ts"; import {relative,isAbsolute,sep} from "node:path"; const lock=externalDirectory("GUI_E2E_LOCK_DIR"),env=guiEnvironment(); const inside=(a,b)=>{const value=relative(a,b);return value===""||(!isAbsolute(value)&&value!==".."&&!value.startsWith(".."+sep));}; if([env.artifacts,env.screenshots,env.baselines].filter(Boolean).some(path=>inside(path,lock)||inside(lock,path)))throw Error("Lock directory must be separate from artifacts, screenshots and baselines");' || exit $?
mkdir -p -- "$GUI_E2E_ARTIFACTS" "$GUI_E2E_SCREENSHOTS" "$GUI_E2E_LOCK_DIR" || exit 1
# One run owns one directory; never erase a previous failure/report.
mkdir -- "$GUI_E2E_ARTIFACTS/.invocation" || { echo "Artifacts already belong to an invocation" >&2; exit 2; }
backend_key=$(node --input-type=module -e 'import {createHash} from "node:crypto"; if(!process.env.GUI_E2E_S3_ENDPOINT) throw Error("GUI_E2E_S3_ENDPOINT is required"); process.stdout.write(createHash("sha256").update(new URL(process.env.GUI_E2E_S3_ENDPOINT).origin).digest("hex").slice(0,16));') || exit $?
lock="$GUI_E2E_LOCK_DIR/$backend_key.lock"
mkdir -- "$lock" || { echo "A GUI campaign owns this backend; inspect its lock" >&2; exit 2; }
printf '%s\n' "$$" > "$lock/pid"
child=
cleanup() {
  original=$?
  trap - EXIT INT TERM
  if [[ -n $child ]]; then
    kill -TERM "$child" 2>/dev/null || true
    wait "$child" 2>/dev/null || true
  fi
  node --input-type=module -e 'import {readFileSync} from "node:fs"; const value=JSON.parse(readFileSync(process.env.GUI_E2E_ARTIFACTS+"/process-group.json","utf8")); if(!value.groupStopped) process.exit(1);' 2>/dev/null
  if [[ $? == 0 ]]; then
    node e2e/fixtures/guiResources.ts cleanup > "$GUI_E2E_ARTIFACTS/cleanup.log" 2>&1
    cleanup_status=$?
  else
    echo "Worker shutdown is unproven; retaining lock and journal before any cleanup" >&2
    cleanup_status=1
  fi
  GUI_E2E_TEST_STATUS=$original GUI_E2E_CLEANUP_STATUS=$cleanup_status node --input-type=module - "$GUI_E2E_ARTIFACTS" <<'NODE'
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const directory=process.argv[2];
const reportPath=join(directory,'report.json');
const report=existsSync(reportPath)?JSON.parse(readFileSync(reportPath,'utf8')):undefined;
const builtinPath=join(directory,'fixtures','builtin-outcome.json');
const builtin=existsSync(builtinPath)?JSON.parse(readFileSync(builtinPath,'utf8')):undefined;
const files=[]; const walk=suite=>{for(const spec of suite.specs||[])files.push(spec.file);for(const child of suite.suites||[])walk(child)};
for(const suite of report?.suites||[])walk(suite);
writeFileSync(join(directory,'summary.json'),JSON.stringify({finished:new Date().toISOString(),testExit:Number(process.env.GUI_E2E_TEST_STATUS),cleanupExit:Number(process.env.GUI_E2E_CLEANUP_STATUS),stats:report?.stats,files:[...new Set(files)].sort(),builtin:builtin?{path:builtin.path,restored:builtin.restored,saveStatus:builtin.saveStatus,resetStatus:builtin.resetStatus,immediateStatus:builtin.immediate?.status,refreshStatuses:builtin.refreshes.map(item=>item.status),listStatus:builtin.list?.status,reopenedStatus:builtin.reopened?.status,evidence:builtinPath}:undefined},null,2),{mode:0o600});
if(!report || report.stats?.skipped || report.stats?.flaky || report.errors?.length) process.exitCode=1;
NODE
  summary_status=$?
  if [[ $cleanup_status == 0 ]]; then
    rm -f -- "$lock/pid"
    rmdir -- "$lock"
  else
    echo "Cleanup is unproven; backend lock retained at $lock" >&2
  fi
  if [[ $original != 0 ]]; then exit "$original"; fi
  if [[ $cleanup_status != 0 || $summary_status != 0 ]]; then exit 1; fi
  exit 0
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# A baseline-only invocation has no resource-using specs. Acceptance keeps
# updateSnapshots=none from the actual config; it cannot create missing images.
node --input-type=module - "$@" <<'NODE' &
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const worker=spawn('yarn',['exec','playwright','test','--config=playwright.gui.config.ts',...process.argv.slice(2)],{stdio:'inherit',detached:true});
let signalStatus;
const signalGroup=signal=>{try{process.kill(-worker.pid,signal)}catch(error){if(error.code!=='ESRCH')throw error}};
process.on('SIGINT',()=>{signalStatus=130;signalGroup('SIGTERM')});
process.on('SIGTERM',()=>{signalStatus=143;signalGroup('SIGTERM')});
const alive=()=>{
  if(!worker.pid)return false;
  return execFileSync('ps',['-axo','pgid=,stat='],{encoding:'utf8'}).trim().split('\n').some(line=>{const [group,state]=line.trim().split(/\s+/);return Number(group)===worker.pid&&!state.startsWith('Z')});
};
worker.on('error',error=>{writeFileSync(process.env.GUI_E2E_ARTIFACTS+'/process-group.json',JSON.stringify({groupStopped:true,spawnError:error.message}));process.exitCode=1});
worker.on('close',async code=>{
  if(alive())signalGroup('SIGTERM');
  for(let i=0;i<50&&alive();i++)await new Promise(resolve=>setTimeout(resolve,100));
  if(alive())signalGroup('SIGKILL');
  for(let i=0;i<20&&alive();i++)await new Promise(resolve=>setTimeout(resolve,100));
  const groupStopped=!alive();
  writeFileSync(process.env.GUI_E2E_ARTIFACTS+'/process-group.json',JSON.stringify({pid:worker.pid,groupStopped,exit:code,signalStatus,finished:new Date().toISOString()},null,2),{mode:0o600});
  process.exitCode=signalStatus??(groupStopped?(code??1):1);
});
NODE
child=$!
wait "$child"
status=$?
child=
exit "$status"
