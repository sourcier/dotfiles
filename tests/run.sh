#!/usr/bin/env bash
set -euo pipefail

repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
test_root=$(mktemp -d "${TMPDIR:-/tmp}/dotfiles-tests.XXXXXX")
trap 'find "$test_root" -depth -delete' EXIT
mkdir -p "$test_root/source repo" "$test_root/home" "$test_root/tools" "$test_root/caller"
source_root="$test_root/source repo"
export HOME="$test_root/home"
export PATH="$test_root/tools:/usr/bin:/bin:/usr/sbin:/sbin"
export TEST_ROOT="$test_root"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

cp "$repo/bootstrap.sh" "$repo/.zsh" "$repo/.zshrc" "$repo/.aliases" \
  "$repo/.env_vscode" "$source_root/"
printf 'file with spaces\n' > "$source_root/space name"
printf 'hidden\n' > "$source_root/.hidden"
printf 'caller only\n' > "$test_root/caller/unrelated"
mkdir "$source_root/tests"
printf 'not deployed\n' > "$source_root/tests/marker"
mkdir "$source_root/scripts" "$source_root/node_modules"
printf 'not deployed\n' > "$source_root/package.json"
printf 'not deployed\n' > "$source_root/pnpm-lock.yaml"
printf 'not deployed\n' > "$source_root/pnpm-workspace.yaml"
mkdir -p "$HOME/.config"
printf 'preserved\n' > "$HOME/.config/keep"
mkdir -p "$source_root/.config"
printf 'new config\n' > "$source_root/.config/new"
mkdir -p "$source_root/bin" "$source_root/.config/keepass-sync"
cp "$repo/bin/sync-keepass-db" "$source_root/bin/"
cp "$repo/.config/keepass-sync/config.json" "$source_root/.config/keepass-sync/"

cat > "$test_root/tools/rsync" <<'EOF'
#!/bin/bash
if [[ ${FAIL_COPY:-0} == 1 ]]; then
  exit 23
fi
exec /usr/bin/rsync "$@"
EOF
cat > "$test_root/tools/zsh" <<'EOF'
#!/bin/bash
if [[ -n ${STARTUP_MESSAGE:-} ]]; then
  printf '%s\n' "$STARTUP_MESSAGE"
  exit "${STARTUP_STATUS:-0}"
fi
exec /bin/zsh "$@"
EOF
chmod +x "$test_root/tools/rsync" "$test_root/tools/zsh"

(cd "$test_root/caller" && bash "$source_root/bootstrap.sh") > "$test_root/result" 2>&1
cmp "$source_root/space name" "$HOME/space name"
cmp "$source_root/.hidden" "$HOME/.hidden"
test ! -e "$HOME/unrelated"
test ! -e "$HOME/tests"
for development_file in scripts node_modules package.json pnpm-lock.yaml pnpm-workspace.yaml; do
  test ! -e "$HOME/$development_file" || fail "bootstrap deployed $development_file"
done
test -f "$HOME/.config/keep"
cmp "$source_root/.config/new" "$HOME/.config/new"
cmp "$repo/bin/sync-keepass-db" "$HOME/bin/sync-keepass-db"
test -x "$HOME/bin/sync-keepass-db"
cmp "$repo/.config/keepass-sync/config.json" "$HOME/.config/keepass-sync/config.json"
bash "$source_root/bootstrap.sh" > "$test_root/result" 2>&1
if FAIL_COPY=1 bash "$source_root/bootstrap.sh" > "$test_root/result" 2>&1; then
  fail "bootstrap accepted a failed copy"
fi
if grep -q 'Verifying shell startup\|Done' "$test_root/result"; then
  fail "bootstrap continued after a failed copy"
fi
for startup_status in 0 7; do
  if STARTUP_MESSAGE='github_pat_fixture_only' STARTUP_STATUS="$startup_status" \
      bash "$source_root/bootstrap.sh" > "$test_root/result" 2>&1; then
    fail "bootstrap accepted suspicious or failed startup"
  fi
  if grep -q github_pat_fixture_only "$test_root/result"; then
    fail "bootstrap exposed captured startup output"
  fi
done
echo "PASS: bootstrap paths, merging, repeat runs, failures, and output redaction"

mkdir -p "$HOME/.oh-my-zsh" "$HOME/.cache"
printf 'export OMZ_LOADED=yes\n' > "$HOME/.oh-my-zsh/oh-my-zsh.sh"
printf 'export PROMPT_LOADED=yes\n' > "$HOME/.p10k.zsh"
printf 'export INSTANT_PROMPT_LOADED=yes\n' > "$HOME/.cache/p10k-instant-prompt-$(id -un).zsh"
printf 'export TOOL_ENV_LOADED=yes\n' > "$HOME/.env_test"
cp "$repo/.env_secrets" "$HOME/"
printf 'export PATH="$TEST_ROOT/tools:$PATH"\n' > "$HOME/.zprofile"
cat > "$test_root/tools/security" <<'EOF'
#!/bin/bash
printf '%s\n' "$1" >> "$TEST_ROOT/keychain-calls"
case "$1" in
  dump-keychain) printf '%s\n' '"svce"<blob>="env-secret:DOTFILES_TEST_TOKEN"' ;;
  find-generic-password) printf '%s\n' fixture-value ;;
  *) exit 1 ;;
esac
EOF
chmod +x "$test_root/tools/security"
for mode in terminal vscode-user vscode-agent cli-agent; do
  agent=0
  case "$mode" in
    terminal) program=Apple_Terminal; user_terminal=1 ;;
    vscode-user) program=vscode; user_terminal=1 ;;
    vscode-agent) program=vscode; user_terminal= ;;
    cli-agent) program=Apple_Terminal; user_terminal=1; agent=1 ;;
  esac
  env -u OMZ_LOADED -u PROMPT_LOADED -u INSTANT_PROMPT_LOADED -u DOTFILES_TEST_TOKEN \
    TERM_PROGRAM="$program" VSCODE_USER_TERMINAL="$user_terminal" DOTFILES_AGENT="$agent" \
    /bin/zsh -lic '[[ -z $OMZ_LOADED && -z $PROMPT_LOADED && -z $INSTANT_PROMPT_LOADED &&
      -z $DOTFILES_TEST_TOKEN && $TOOL_ENV_LOADED == yes ]]' \
    > "$test_root/result" 2>&1
  test ! -s "$test_root/result" || fail "$mode emitted startup errors"
done
test ! -e "$test_root/keychain-calls" || fail "non-TTY shells accessed Keychain"
for mode in terminal vscode-user vscode-agent cli-agent; do
  agent=0
  case "$mode" in
    terminal) program=Apple_Terminal; user_terminal=1; expected=yes ;;
    vscode-user) program=vscode; user_terminal=1; expected=yes ;;
    vscode-agent) program=vscode; user_terminal=; expected= ;;
    cli-agent) program=Apple_Terminal; user_terminal=1; agent=1; expected= ;;
  esac
  rm -f "$test_root/keychain-calls"
  /usr/bin/script -q /dev/null env -u OMZ_LOADED -u PROMPT_LOADED -u INSTANT_PROMPT_LOADED -u DOTFILES_TEST_TOKEN \
    TERM_PROGRAM="$program" VSCODE_USER_TERMINAL="$user_terminal" DOTFILES_AGENT="$agent" EXPECTED_CUSTOMIZATIONS="$expected" \
    /bin/zsh -lic '[[ $OMZ_LOADED == "$EXPECTED_CUSTOMIZATIONS" &&
      $PROMPT_LOADED == "$EXPECTED_CUSTOMIZATIONS" &&
      $INSTANT_PROMPT_LOADED == "$EXPECTED_CUSTOMIZATIONS" &&
      ( ( -n $EXPECTED_CUSTOMIZATIONS && $DOTFILES_TEST_TOKEN == fixture-value ) ||
        ( -z $EXPECTED_CUSTOMIZATIONS && -z $DOTFILES_TEST_TOKEN ) ) &&
      $TOOL_ENV_LOADED == yes ]] && print -r -- CUSTOMIZATIONS_OK' \
    > "$test_root/result" 2>&1 < /dev/null || {
      cat "$test_root/result"
      fail "$mode TTY startup"
    }
  grep -q 'CUSTOMIZATIONS_OK' "$test_root/result" || fail "$mode TTY customization gating"
  if [[ -z "$expected" && -e "$test_root/keychain-calls" ]]; then
    fail "$mode accessed Keychain automatically"
  fi
done
echo "PASS: agent shells skip Oh My Zsh and prompts while user TTYs retain them"
env -u DOTFILES_TEST_TOKEN TERM_PROGRAM=vscode VSCODE_USER_TERMINAL= /bin/zsh -lic \
  'secret-load DOTFILES_TEST_TOKEN && [[ $DOTFILES_TEST_TOKEN == fixture-value ]]' \
  > "$test_root/result" 2>&1
test ! -s "$test_root/result" || fail "secret-load printed a credential"
if TERM_PROGRAM=vscode VSCODE_USER_TERMINAL= /bin/zsh -lic 'secret-load "invalid-name"' \
    > "$test_root/result" 2>&1; then
  fail "secret-load accepted an invalid name"
fi
echo "PASS: agent shells avoid Keychain access and support explicit credential loading"
cat > "$test_root/tools/code" <<'EOF'
#!/bin/bash
case "${CODE_MODE:-missing}" in
  fail) exit 1 ;;
  missing) printf '%s\n' "$TEST_ROOT/missing-integration" ;;
  valid) printf '%s\n' "$TEST_ROOT/integration.zsh" ;;
esac
EOF
printf 'export INTEGRATION_LOADED=yes\n' > "$test_root/integration.zsh"
chmod +x "$test_root/tools/code"
for code_mode in fail missing valid; do
  CODE_MODE="$code_mode" TERM_PROGRAM=vscode /bin/zsh -f -c \
    'source "$HOME/.env_vscode"; [[ $CODE_MODE != valid || $INTEGRATION_LOADED == yes ]]' \
    > "$test_root/result" 2>&1
  test ! -s "$test_root/result" || fail "invalid VS Code integration produced output"
done
echo "PASS: terminal modes, absent Oh My Zsh, and VS Code integration guards"

test ! -e "$repo/.env_git"
git init -q "$test_root/git-project"
git -C "$test_root/git-project" config user.name "Fixture User"
git -C "$test_root/git-project" config user.email "fixture@example.test"
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL \
  TERM_PROGRAM=vscode VSCODE_USER_TERMINAL= /bin/zsh -lic \
  '[[ $(git -C "$TEST_ROOT/git-project" var GIT_AUTHOR_IDENT) == "Fixture User <fixture@example.test> "* ]]'
echo "PASS: repository-local Git identity survives shell startup"

cat > "$test_root/tools/brew" <<'EOF'
#!/bin/bash
[[ "$*" == "--prefix postgresql@16" ]] || exit 1
[[ ${FAIL_BREW:-0} == 0 ]] || exit 1
printf '%s\n' "$TEST_ROOT/postgresql@16"
EOF
chmod +x "$test_root/tools/brew"
/bin/zsh -f -c 'before=$PATH; source "$1"; [[ $PATH == $before ]]' \
  verify "$repo/.env_postgresql"
mkdir -p "$test_root/postgresql@16/bin"
FAIL_BREW=1 /bin/zsh -f -c 'before=$PATH; source "$1"; [[ $PATH == $before ]]' \
  verify "$repo/.env_postgresql"
/bin/zsh -f -c \
  'source "$1"; before=$PATH; source "$1"; [[ $PATH == $before && $PATH == "$TEST_ROOT/postgresql@16/bin:"* ]]' \
  verify "$repo/.env_postgresql"
echo "PASS: PostgreSQL presence checks and repeat sourcing"

cat > "$test_root/tools/lsof" <<'EOF'
#!/bin/bash
printf '%s\n' "$*" > "$TEST_ROOT/lsof-args"
if [[ ${LSOF_STATUS:-0} != 0 ]]; then
  exit "$LSOF_STATUS"
fi
printf '%s\n' "${LSOF_OUTPUT:-12345}"
EOF
chmod +x "$test_root/tools/lsof"
kill() {
  printf '%s\n' "$*" >> "$TEST_ROOT/signals"
  return "${KILL_STATUS:-0}"
}
export -f kill
printf 'preserve this file\n' > "$test_root/caller/temp.text"
(cd "$test_root/caller" && LSOF_OUTPUT=$'12345\n67890' bash "$repo/bin/stoponport" 03000) \
  > "$test_root/result"
grep -qx -- '-nP -t -iTCP:3000 -sTCP:LISTEN' "$test_root/lsof-args"
printf '%s\n' '-TERM 12345' '-TERM 67890' > "$test_root/expected"
cmp "$test_root/expected" "$test_root/signals"
test "$(cat "$test_root/caller/temp.text")" = 'preserve this file'
for utility in stoponport whatsonport; do
  for port in '' 0 65536 -1 abc '3000,4000'; do
    if bash "$repo/bin/$utility" "$port" > "$test_root/result" 2>&1; then
      fail "$utility accepted invalid port '$port'"
    fi
  done
  if bash "$repo/bin/$utility" > "$test_root/result" 2>&1; then
    fail "$utility accepted a missing port"
  fi
  if LSOF_STATUS=2 bash "$repo/bin/$utility" 3000 > "$test_root/result" 2>&1; then
    fail "$utility ignored lsof failure"
  fi
done
LSOF_STATUS=1 bash "$repo/bin/stoponport" 3000 > "$test_root/result"
if KILL_STATUS=1 bash "$repo/bin/stoponport" 3000 > "$test_root/result" 2>&1; then
  fail "stoponport ignored signal failure"
fi
if LSOF_OUTPUT=0 bash "$repo/bin/stoponport" 3000 > "$test_root/result" 2>&1; then
  fail "stoponport accepted an unsafe PID"
fi
bash "$repo/bin/whatsonport" 3000 > "$test_root/result"
grep -qx -- '-nP -iTCP:3000 -sTCP:LISTEN' "$test_root/lsof-args"
echo "PASS: port validation, listener selection, graceful signals, and failures"
