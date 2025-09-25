#!/bin/bash
TEST_REPORT_ABSOLUTE_DIR="${TEST_REPORT_ABSOLUTE_DIR:-/app/reports}"

if [ ! -d "${TEST_REPORT_ABSOLUTE_DIR}" ]; then
  mkdir "${TEST_REPORT_ABSOLUTE_DIR}"
fi

echo Running acceptance tests...
./node_modules/.bin/cucumber-js \
  --require './dist/tests/acceptance/steps/*.js' \
  --format "json:${TEST_REPORT_ABSOLUTE_DIR}/cucumber.json" \
  --tags 'not @ignore' \
  ./features
