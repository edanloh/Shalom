#!/usr/bin/env bash
set -euo pipefail

APP_ID="com.jasmine02.shalom"
LOGCAT_FILE="/tmp/maestro-logcat.txt"

append_crash_report() {
  {
    echo "===== Crash Buffer (latest) ====="
    adb logcat -d -b crash || true
    echo "===== App/Fatal Filter ====="
    adb logcat -d | grep -E "${APP_ID}|FATAL EXCEPTION|Fatal signal|Abort message|JsErrorHandler|BridgelessReact|supabaseUrl is required" || true
  } >> "$LOGCAT_FILE"
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

adb logcat -c || true
: > "$LOGCAT_FILE"

overall_exit=0
total_flows=0
passed_flows=0
failed_flows=0
failed_flow_list=""

for flow in $(find mobile/.maestro -maxdepth 1 -type f -name "*.yaml" | sort); do
  total_flows=$((total_flows + 1))
  echo "===== Running flow: ${flow} ====="
  if ! wait_for_login_screen; then
    echo "Preflight failed before ${flow}"
    append_crash_report
    adb logcat -d | tee -a "$LOGCAT_FILE" | tail -n 400 || true
    failed_flows=$((failed_flows + 1))
    failed_flow_list+="${flow}\n"
    echo "Flow status: FAILED (${flow})"
    overall_exit=1
    continue
  fi

  if ! "$HOME/.maestro/bin/maestro" test "$flow"; then
    echo "Flow failed: ${flow}"
    append_crash_report
    adb logcat -d | tee -a "$LOGCAT_FILE" | tail -n 400 || true
    failed_flows=$((failed_flows + 1))
    failed_flow_list+="${flow}\n"
    echo "Flow status: FAILED (${flow})"
    overall_exit=1
  else
    passed_flows=$((passed_flows + 1))
    echo "Flow status: PASSED (${flow})"
  fi
done

echo "===== Maestro Flow Summary ====="
echo "Passed/Total: ${passed_flows}/${total_flows}"
echo "Failed: ${failed_flows}"
if [ "$failed_flows" -gt 0 ]; then
  echo "Failed flows:"
  printf "%b" "$failed_flow_list"
fi

exit $overall_exit
