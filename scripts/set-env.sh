#!/bin/bash
# Saves one private setting into .env.local without showing it on screen or putting it in chat.
# Usage: bash scripts/set-env.sh GEMINI_API_KEY
cd "$(dirname "$0")/.." || exit 1
NAME="$1"
case "$NAME" in
  GEMINI_API_KEY|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY) ;;
  *) echo "Unknown setting name. Nothing was changed."; exit 1 ;;
esac
printf "Paste the value for %s (nothing will show as you paste), then press Enter: " "$NAME"
read -rs VALUE
echo
if [ -z "$VALUE" ]; then echo "Nothing entered. Nothing was changed."; exit 1; fi
touch .env.local
grep -v "^${NAME}=" .env.local > .env.local.tmp
printf '%s=%s\n' "$NAME" "$VALUE" >> .env.local.tmp
mv .env.local.tmp .env.local
echo "Saved $NAME. You can close this tab and tell Claude."
