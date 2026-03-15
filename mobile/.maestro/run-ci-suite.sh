#!/usr/bin/env bash
set -euo pipefail

APP_ID="com.jasmine02.shalom"
LOGCAT_FILE="/tmp/maestro-logcat.txt"
SUITE_LOG_FILE="/tmp/maestro-suite.log"
SCREENSHOT_DIR="/tmp/maestro-screenshots"

# Mirror all runner output to file for GitHub job summary parsing.
: > "$SUITE_LOG_FILE"
exec > >(tee -a "$SUITE_LOG_FILE") 2>&1

append_crash_report() {
  {
    echo "===== Crash Buffer (latest) ====="
    adb logcat -d -b crash || true
    echo "===== App/Fatal Filter ====="
    adb logcat -d | grep -E "${APP_ID}|FATAL EXCEPTION|Fatal signal|Abort message|JsErrorHandler|BridgelessReact|supabaseUrl is required" || true
  } >> "$LOGCAT_FILE"
}

append_recent_logcat() {
  adb logcat -d | tee -a "$LOGCAT_FILE" | tail -n 400 || true
}

capture_flow_screenshot() {
  local flow="$1"
  local flow_name ts screenshot_file
  flow_name="$(basename "$flow" .yaml)"
  ts="$(date +%Y%m%d-%H%M%S)"
  screenshot_file="${SCREENSHOT_DIR}/${ts}-${flow_name}.png"

  # Keep the suite running even when screenshot capture fails.
  adb exec-out screencap -p > "$screenshot_file" 2>/dev/null || true
  echo "Screenshot saved: ${screenshot_file}"
}

dismiss_system_dialogs() {
  local ui
  ui="$(adb exec-out uiautomator dump /dev/tty 2>/dev/null || true)"

  # "System UI isn't responding" dialog
  if echo "$ui" | grep -q 'resource-id="android:id/aerr_wait"'; then
    adb shell input tap 720 1454 || true
    sleep 2
  fi

  # "<App> keeps stopping" dialog
  if echo "$ui" | grep -q 'resource-id="android:id/aerr_close"'; then
    adb shell input tap 720 1454 || true
    sleep 2
  fi
}

wait_for_login_screen() {
  local attempt ui
  for attempt in 1 2 3 4 5; do
    echo "Preflight attempt ${attempt}: launch app and verify login screen"
    adb shell am force-stop "$APP_ID" || true
    sleep 1
    adb shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
    sleep 8
    dismiss_system_dialogs

    ui="$(adb exec-out uiautomator dump /dev/tty 2>/dev/null || true)"
    if echo "$ui" | grep -q 'Login to your Account'; then
      echo "Login screen is visible"
      return 0
    fi
  done

  echo "Login screen did not appear after retries"
  return 1
}

record_failure() {
  local flow="$1"
  failed_flows=$((failed_flows + 1))
  failed_flow_list+="${flow}\n"
  echo "Flow status: FAILED (${flow})"
  overall_exit=1
}

record_success() {
  local flow="$1"
  passed_flows=$((passed_flows + 1))
  echo "Flow status: PASSED (${flow})"
}

record_skip() {
  local flow="$1"
  skipped_flows=$((skipped_flows + 1))
  skipped_flow_list+="${flow}\n"
  echo "Flow status: SKIPPED (${flow})"
}

should_skip_flow() {
  local flow="$1"
  [ "$(basename "$flow")" = "auth-login-success.yaml" ] && {
    [ -z "${MAESTRO_TEST_EMAIL:-}" ] || [ -z "${MAESTRO_TEST_PASSWORD:-}" ]
  }
}

run_flow() {
  local flow="$1"
  echo "===== Running flow: ${flow} ====="

  if should_skip_flow "$flow"; then
    echo "Skipping ${flow}: MAESTRO_TEST_EMAIL and MAESTRO_TEST_PASSWORD are required for successful auth flow"
    record_skip "$flow"
    return 0
  fi

  if ! wait_for_login_screen; then
    echo "Preflight failed before ${flow}"
    append_crash_report
    append_recent_logcat
    record_failure "$flow"
    return 0
  fi

  if ! "$HOME/.maestro/bin/maestro" test "${maestro_env_args[@]}" "$flow"; then
    echo "Flow failed: ${flow}"
    append_recent_logcat
    record_failure "$flow"
    return 0
  fi

  record_success "$flow"
}

adb logcat -c || true
: > "$LOGCAT_FILE"
mkdir -p "$SCREENSHOT_DIR"

overall_exit=0
total_flows=0
passed_flows=0
failed_flows=0
skipped_flows=0
failed_flow_list=""
skipped_flow_list=""

maestro_env_args=()
if [ -n "${MAESTRO_TEST_EMAIL:-}" ]; then
  maestro_env_args+=("-e" "MAESTRO_TEST_EMAIL=${MAESTRO_TEST_EMAIL}")
fi
if [ -n "${MAESTRO_TEST_PASSWORD:-}" ]; then
  maestro_env_args+=("-e" "MAESTRO_TEST_PASSWORD=${MAESTRO_TEST_PASSWORD}")
fi

while IFS= read -r -d '' flow; do
  total_flows=$((total_flows + 1))
  run_flow "$flow"
  capture_flow_screenshot "$flow"
done < <(find mobile/.maestro -maxdepth 1 -type f -name "*.yaml" -print0 | sort -z)

echo "===== Maestro Flow Summary ====="
echo "Passed/Total: ${passed_flows}/${total_flows}"
echo "Failed: ${failed_flows}"
echo "Skipped: ${skipped_flows}"
if [ "$failed_flows" -gt 0 ]; then
  echo "Failed flows:"
  printf "%b" "$failed_flow_list"
fi
if [ "$skipped_flows" -gt 0 ]; then
  echo "Skipped flows:"
  printf "%b" "$skipped_flow_list"
fi

exit $overall_exit
