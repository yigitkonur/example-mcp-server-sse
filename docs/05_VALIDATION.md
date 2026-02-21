# 05 - Validation

## Root Validation

```bash
npm install
npm run ci
```

This runs:

- typecheck
- lint
- format check
- build
- smoke test

## Generated Project Validation

```bash
npm run create -- --name validate --target .generated/validate
cd .generated/validate
npm install
npm run build
npm run typecheck
npm run smoke
```

## Expected Outcome

- Root smoke test succeeds.
- Generated project smoke test succeeds.
- Health endpoint responds and tool calls complete.
