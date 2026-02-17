# Release Process

## Versioning
- SemVer recommended: MAJOR.MINOR.PATCH
- Bump version in `app/package.json` as needed.

## Branching
- `main` deploys to production (Netlify)
- Use feature branches for overlays/changes.

## Checklist
- [ ] Update migrations if schema changed
- [ ] Update ENV matrix if new vars introduced
- [ ] Local build passes
- [ ] Netlify deploy success
- [ ] Smoke tests completed
- [ ] Record release notes
