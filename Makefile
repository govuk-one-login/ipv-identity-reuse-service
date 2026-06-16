build-ConfirmDetailsLambda:
	./node_modules/.bin/esbuild src/handlers/confirm-details/confirm-details-handler.ts \
		--bundle \
		--platform=node \
		--target=es2022 \
		--minify \
		--sourcemap \
		--external:govuk-frontend \
		--outdir=$(ARTIFACTS_DIR)
	cp src/handlers/confirm-details/*.njk $(ARTIFACTS_DIR)/

build-UnrecoverableErrorLambda:
	./node_modules/.bin/esbuild src/handlers/unrecoverable-error/unrecoverable-error-handler.ts \
		--bundle \
		--platform=node \
		--target=es2022 \
		--minify \
		--sourcemap \
		--external:govuk-frontend \
		--outdir=$(ARTIFACTS_DIR)
	cp src/handlers/unrecoverable-error/*.njk $(ARTIFACTS_DIR)/
