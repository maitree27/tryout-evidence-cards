#!/bin/bash
# Saves your Supabase secret key into .env.local without showing it on screen or putting it in chat.
cd "$(dirname "$0")/.." || exit 1
printf "Paste your Supabase secret key (nothing will show as you paste), then press Enter: "
read -rs KEY
echo
case "$KEY" in
  sb_secret_*|eyJ*) ;;
  *) echo "That doesn't look like a Supabase secret key (it should start with sb_secret_). Nothing was changed."; exit 1 ;;
esac
grep -v '^SUPABASE_SERVICE_ROLE_KEY=' .env.local > .env.local.tmp
printf 'SUPABASE_SERVICE_ROLE_KEY=%s\n' "$KEY" >> .env.local.tmp
mv .env.local.tmp .env.local
echo "Saved. You can close this tab and tell Claude."
