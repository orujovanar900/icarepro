---
description: Pre-commit TypeScript check — build API and web before committing
---

Always run these two build checks before any `git commit` to catch TypeScript errors:

// turbo-all
1. Build the API (TypeScript compile):
```
pnpm --filter @icare/api build
```

// turbo-all
2. Type-check the web app:
```
npx tsc --noEmit -p apps/web/tsconfig.json
```

3. If either command fails, fix all TypeScript errors before proceeding with the commit.

4. Once both pass with no errors, proceed with the commit:
```
git add -A && git commit -m "<message>" && git push
```
