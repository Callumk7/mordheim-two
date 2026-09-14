#!/usr/bin/env bash
# Cloud Agent install script for the Mordheim Campaign Ledger.
# Idempotent: it may run repeatedly against cached or partially prepared state.
set -euo pipefail

cd "$(dirname "$0")/.."

# ---------------------------------------------------------------------------
# Node runtime
#
# The base image exposes an older Node on PATH (via the exec daemon). The test
# suite exercises node:sqlite's StatementSync.setReturnArrays, which only exists
# in Node >= 22.16. We select a suitable Node 22 from nvm and expose it ahead of
# the daemon-provided binary so every shell and tool (install/start/terminals
# and interactive agent shells) resolves to it.
# ---------------------------------------------------------------------------
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

has_required_node() {
	"$1" -e 'const {DatabaseSync}=require("node:sqlite");if(typeof new DatabaseSync(":memory:").prepare("select 1").setReturnArrays!=="function")process.exit(1)' >/dev/null 2>&1
}

node_bin="$(nvm which 22 2>/dev/null || true)"
if [ -z "$node_bin" ] || ! has_required_node "$node_bin"; then
	nvm install 22 >/dev/null
	node_bin="$(nvm which 22)"
fi
has_required_node "$node_bin" || {
	echo "error: Node at '$node_bin' lacks node:sqlite setReturnArrays (need Node >= 22.16)" >&2
	exit 1
}

# Symlink the chosen node into the first writable PATH directory that precedes
# the daemon-provided Node so a bare `node` resolves to it everywhere.
IFS=':' read -ra path_parts <<<"$PATH"
for dir in "${path_parts[@]}"; do
	case "$dir" in
		/exec-daemon | /exec-daemon/*) break ;;
	esac
	[ -d "$dir" ] || continue
	if [ -w "$dir" ]; then
		ln -sf "$node_bin" "$dir/node"
		break
	elif sudo -n true 2>/dev/null; then
		sudo ln -sf "$node_bin" "$dir/node"
		break
	fi
done

echo "node: $(command -v node) ($(node -v))"

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Local Cloudflare D1 database (Wrangler/Miniflare, no Cloudflare auth needed).
# Migrations track applied state and the seed uses INSERT OR IGNORE, so both
# steps are safe to re-run.
# ---------------------------------------------------------------------------
pnpm db:migrate:local
pnpm db:seed:local

echo "Cloud Agent install complete."
