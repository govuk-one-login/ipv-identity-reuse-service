#!/bin/bash
TEST_REPORT_ABSOLUTE_DIR="${TEST_REPORT_ABSOLUTE_DIR:-/app/reports}"

if [ ! -d "${TEST_REPORT_ABSOLUTE_DIR}" ]; then
  echo "Creating directory ${TEST_REPORT_ABSOLUTE_DIR}"
  mkdir "${TEST_REPORT_ABSOLUTE_DIR}"
fi

echo "Test reports will be written to ${TEST_REPORT_ABSOLUTE_DIR}"

cd /app
echo Running acceptance tests...
./node_modules/.bin/cucumber-js \
  --require './dist/tests/acceptance/steps/*.js' \
  --format "json:${TEST_REPORT_ABSOLUTE_DIR}/cucumber.json" \
  --format pretty \
  --tags 'not @ignore' \
  ./features
