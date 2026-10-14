#!/bin/bash
set -eo pipefail

cd /home/ubuntu/rilog-next
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 24.19.0 >/dev/null

# Validate runtime configuration without printing the credential or its value.
node --env-file=.env.production.local --input-type=module -e '
  import { readFile } from "node:fs/promises";
  import { waitForTheRilogPage } from "./scripts/refresh-the-rilog.mjs";

  if (!process.env.THE_RILOG_REVALIDATION_SECRET?.trim()) {
    console.error("THE_RILOG_REVALIDATION_SECRET is required for the daily refresh");
    process.exit(1);
  }

  try {
    const snapshot = JSON.parse(await readFile(".the-rilog-build/snapshot.json", "utf8"));
    await waitForTheRilogPage({ receipt: snapshot, attempts: 10, timeoutMs: 10_000 });
  } catch {
    console.error("The Rilog deployed snapshot is not ready; daily timer was not installed");
    process.exit(1);
  }
'

sudo -n true
sudo -n install -m 644 deploy/the-rilog-refresh.service /etc/systemd/system/the-rilog-refresh.service
sudo -n install -m 644 deploy/the-rilog-refresh.timer /etc/systemd/system/the-rilog-refresh.timer
sudo -n systemctl daemon-reload
sudo -n systemctl enable --now the-rilog-refresh.timer
