#!/bin/bash
echo "Configuring reports..."
export TEST_REPORT_ABSOLUTE_DIR="${TEST_REPORT_ABSOLUTE_DIR:-/app/reports}"

if [ ! -d "${TEST_REPORT_ABSOLUTE_DIR}" ]; then
  echo "Creating directory ${TEST_REPORT_ABSOLUTE_DIR}"
  mkdir "${TEST_REPORT_ABSOLUTE_DIR}"
fi

echo "Test reports will be written to ${TEST_REPORT_ABSOLUTE_DIR}"

echo Running browser tests...
cd /app
export PLAYWRIGHT_FORCE_TTY=1
export PLAYWRIGHT_JUNIT_OUTPUT_FILE="${TEST_REPORT_ABSOLUTE_DIR}/junit.xml"
./node_modules/.bin/playwright test \
  --add-reporter junit
