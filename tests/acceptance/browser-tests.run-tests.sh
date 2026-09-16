#!/bin/bash
TEST_REPORT_ABSOLUTE_DIR="${TEST_REPORT_ABSOLUTE_DIR:-/app/reports}"

if [ ! -d "${TEST_REPORT_ABSOLUTE_DIR}" ]; then
  echo "Creating directory ${TEST_REPORT_ABSOLUTE_DIR}"
  mkdir "${TEST_REPORT_ABSOLUTE_DIR}"
fi

echo "Test reports will be written to ${TEST_REPORT_ABSOLUTE_DIR}"

cd /app

echo Running browser tests...
cd /app
./node_modules/.bin/playwright test \
  --add-reporter junit

