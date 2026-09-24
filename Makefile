.PHONY: setup check typecheck lint format-check fmt test coverage smoke

setup:
	npm install

## The gate: every ticket must pass this before PR
check:
	npm run check

typecheck:
	npm run typecheck

lint:
	npm run lint

format-check:
	npm run format:check

fmt:
	npm run format

test:
	npm test

coverage:
	npm run coverage

## Real-model smoke tests (needs .env); never in CI
smoke:
	npm run smoke
