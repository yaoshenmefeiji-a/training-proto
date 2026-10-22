#!/usr/bin/env bash
# GitHub Pages 产物：只发布网站要用的文件。
# 白名单 = index.html 自己引用的本地 js / css（去掉 ?v=），加上 index.html、.nojekyll；有 assets/ 时一起带上。
# tests/、*.md（prd-diff、README、v2ray-fields）、shots/、scripts/、.github/ 都不进产物。
# 用法：bash scripts/build-site.sh [输出目录，默认 _site]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-_site}"; case "$OUT" in /*) ;; *) OUT="$ROOT/$OUT";; esac
rm -rf "$OUT"; mkdir -p "$OUT"
cd "$ROOT"
cp index.html .nojekyll "$OUT"/
grep -oE '(src|href)="[^"?#]+' index.html | sed -E 's/^(src|href)="//' | grep -vE '^(https?:)?//' | sort -u | while read -r f; do
  [ -f "$f" ] || { echo "::error::index.html 引用的 $f 不存在"; exit 1; }
  mkdir -p "$OUT/$(dirname "$f")"; cp "$f" "$OUT/$f"
done
[ -d assets ] && cp -r assets "$OUT"/ || true
# 自检：内部文件一个都不能有
BAD="$(cd "$OUT" && find . -type f \( -name '*.md' -o -path './tests/*' -o -path './shots/*' -o -path './scripts/*' -o -path './.github/*' -o -name '*.py' -o -name '*.test.js' \))"
if [ -n "$BAD" ]; then echo "::error::产物里有内部文件："; echo "$BAD"; exit 1; fi
(cd "$OUT" && find . -type f | sed 's#^\./##' | sort)
