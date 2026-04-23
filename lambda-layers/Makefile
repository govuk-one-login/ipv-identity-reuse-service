TARGET_DIR := node_modules

find-up = $(if $(wildcard $(2)/$(1)),\
    $(2), \
    $(if $(patsubst /,,$(2)),\
        $(call find-up,$(1),$(patsubst %/,%,$(dir $(2)))),\
    )\
)

PROJECT_ROOT := $(strip $(call find-up,$(TARGET_DIR),$(MAKEFILE_LIST)))

build-GovUKFrontEndLayer:
	@if [ ! -n "$(PROJECT_ROOT)" ]; then \
		echo "The node_modules folder was no found."; \
		exit 1; \
	fi

	mkdir -p $(ARTIFACTS_DIR)/nodejs/node_modules
	cp -R $(PROJECT_ROOT)/node_modules/govuk-frontend $(ARTIFACTS_DIR)/nodejs/node_modules/govuk-frontend
