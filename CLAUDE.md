# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Build/Serve: `npm run serve` - Start Firebase emulators for local development
- Deploy: `npm run deploy` - Deploy functions to Firebase
- Test: `npm test` - Run all integration tests
- Single Test: `npx mocha test/integration/file-name.test.js` - Run specific test file

## Code Style
- Use CommonJS modules (require/module.exports)
- camelCase for variables, functions, and file names
- Maintain JSDoc comments for functions with @param and @returns tags
- Group imports by type: dependencies first, then internal modules
- Function naming: use descriptive verb-noun format (handleWebhook, verifySignature)

## Error Handling
- Use try/catch blocks in higher-level functions
- Log detailed error messages with console.error
- Return appropriate HTTP status codes (400, 403, 405, 500)
- Include operation context in error messages

## Testing
- Integration tests with Mocha and Chai
- Use mock servers defined in test/ directory
- Tests should be environment-aware (check for NODE_ENV=test)