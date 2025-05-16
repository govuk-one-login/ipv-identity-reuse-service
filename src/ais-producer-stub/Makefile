build-StubAisProducerLambda:
	esbuild $(PWD)/src/ais-producer-stub/ais-producer-stub-handler.ts --outdir=$(ARTIFACTS_DIR) --bundle --minify --sourcemap --format=cjs --target=es2020 --platform=node --loader:.njk=file
	cp -R $(PWD)/node_modules/govuk-frontend $(ARTIFACTS_DIR)/govuk-frontend
	