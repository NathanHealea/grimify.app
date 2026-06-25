#!/usr/bin/env node
// Validates a git commit message against the project's format:
//   type(domain): message
//
// Invoked by .githooks/commit-msg with the path to .git/COMMIT_EDITMSG as $1.

import { readFileSync } from 'node:fs'

const ALLOWED_TYPES = [
  'chore',
  'enhancement',
  'feature',
  'bugfix',
  'hotfix',
  'refactor',
  'docs',
  'test',
  'style',
  'perf',
  'build',
  'ci',
  'revert',
]

const TYPE_RE = ALLOWED_TYPES.join('|')
const PATTERN = new RegExp(
  `^(${TYPE_RE})\\(([a-z0-9][a-z0-9\\-_/]*)\\)!?:\\s.+`,
)

const BYPASS_PREFIXES = ['Merge ', 'Revert "', 'fixup!', 'squash!']

function fail(message, subject) {
  console.error('\n✖ Invalid commit message format.\n')
  console.error(`   ${message}\n`)
  if (subject) console.error(`   Got: "${subject}"\n`)
  console.error('   Expected: type(domain): message')
  console.error(`   Allowed types: ${ALLOWED_TYPES.join(', ')}`)
  console.error('\n   Examples:')
  console.error('     feature(palettes): add hue swap')
  console.error('     bugfix(auth): clear stale session on logout')
  console.error('     chore(deps): bump next to 16.1.7')
  console.error('\n   Bypass once (not recommended): git commit --no-verify\n')
  process.exit(1)
}

const path = process.argv[2]
if (!path) fail('Hook invoked without a commit-message file path.')

const raw = readFileSync(path, 'utf8')
const subject = raw
  .split('\n')
  .map((line) => line.trim())
  .find((line) => line.length > 0 && !line.startsWith('#'))

if (!subject) process.exit(0) // git itself will abort the empty commit

if (BYPASS_PREFIXES.some((p) => subject.startsWith(p))) process.exit(0)

if (!PATTERN.test(subject)) {
  fail('Message did not match the required format.', subject)
}

process.exit(0)
