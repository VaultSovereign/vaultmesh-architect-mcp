RELEASE_TAG ?= v$(shell date +%Y.%m.%d)

.PHONY: release
release:
	@echo "🔖 Creating $(RELEASE_TAG)"
	git tag -a $(RELEASE_TAG) -m "VaultMesh Architect MCP release $(RELEASE_TAG)"
	git push origin $(RELEASE_TAG)
	gh release create $(RELEASE_TAG) --title "$(RELEASE_TAG)" \
		--notes-file docs/releases/$(RELEASE_TAG).md \
		--verify-tag --generate-notes || true

