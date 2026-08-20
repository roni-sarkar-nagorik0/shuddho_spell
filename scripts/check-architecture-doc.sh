#!/usr/bin/env bash
# F0.1's test.
#
#   1. ARCHITECTURE.md contains all five required sections.
#   2. Every port named in .claude/docs/05-domain-model.md appears in the token table,
#      with a Symbol token beside it.
#
# Exits non-zero on the first failure, listing what is missing.

set -uo pipefail
cd "$(dirname "$0")/.."

DOC=ARCHITECTURE.md
SPEC=.claude/docs/05-domain-model.md
failures=0

fail() { printf '  FAIL  %s\n' "$1"; failures=$((failures + 1)); }
pass() { printf '  ok    %s\n' "$1"; }

[ -f "$DOC" ]  || { printf 'FAIL: %s does not exist\n' "$DOC"; exit 1; }
[ -f "$SPEC" ] || { printf 'FAIL: %s does not exist\n' "$SPEC"; exit 1; }

echo "1. required sections"
while IFS='|' read -r heading label; do
  if grep -qE "^## $heading" "$DOC"; then pass "$label"; else fail "missing section: $label"; fi
done <<'SECTIONS'
1\. Layer dependency diagram|layer dependency diagram
2\. Folder tree|folder tree
3\. Ports and tokens|token / port table
4\. Database tables|database table list
5\. Decisions I made that were not specified|unspecified decisions
SECTIONS

echo
echo "2. ports declared in $SPEC"

# Every `IXxx` in backticks under the two port headings of the spec.
# A line the spec opens with "(No ..." is a NEGATIVE declaration — a port it says must not
# exist (e.g. IMailer, deferred to v2). Those are collected separately and asserted absent.
region=$(awk '
  /^## (Repository|Application) ports/ { inside = 1; next }
  /^## / { inside = 0 }
  inside { print }
' "$SPEC")

ports=$(printf '%s\n' "$region" | grep -v '^(No ' | grep -oE '`I[A-Za-z]+`' | tr -d '`' | sort -u)
banned=$(printf '%s\n' "$region" | grep '^(No ' | grep -oE '`I[A-Za-z]+`' | tr -d '`' | sort -u)

[ -n "$ports" ] || { echo "FAIL: no ports parsed out of $SPEC"; exit 1; }

# The token table is section 3 of the doc.
table=$(awk '/^## 3\. Ports and tokens/ { inside = 1; next } /^## 4\./ { inside = 0 } inside' "$DOC")

for port in $ports; do
  row=$(printf '%s\n' "$table" | grep -E "\`$port\`" | head -1)
  if [ -z "$row" ]; then
    fail "$port — absent from the token table"
    continue
  fi
  token=$(printf '%s\n' "$row" | grep -oE '`[A-Z][A-Z_]+`' | head -1 | tr -d '`')
  if [ -z "$token" ]; then
    fail "$port — in the table, but with no Symbol token"
  else
    pass "$port → $token"
  fi
done

for port in $banned; do
  if printf '%s\n' "$table" | grep -qE "\`$port\`.*Symbol|^\| \`[A-Z_]+\` \| \`$port\`"; then
    fail "$port — declared in the token table, but $SPEC says it must not exist"
  else
    pass "$port — correctly absent from the token table"
  fi
done

echo
printf 'ports checked: %s\n' "$(printf '%s\n' "$ports" | wc -l | tr -d ' ')"
if [ "$failures" -gt 0 ]; then
  printf 'FAILED: %s check(s)\n' "$failures"
  exit 1
fi
echo 'PASSED'
