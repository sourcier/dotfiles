#!/usr/bin/env bash

#-----------------------------------------------------------------------------
# Functions
#-----------------------------------------------------------------------------

# Notice title
notice() { echo -e "\033[1;32m=> $1\033[0m"; }

# Error title
error() { echo -e "\033[1;31m=> Error: $1\033[0m"; }

# List item
c_list() { echo -e "  \033[1;32m✔\033[0m  $1"; }

# Error list item
e_list() { echo -e "  \033[1;31m✖\033[0m  $1"; }

verify_shell_startup() (
  local startup_log
  local suspicious_output_pattern
  startup_log=$(mktemp) || return 1
  trap 'rm -f "$startup_log"' EXIT
  suspicious_output_pattern='(^[A-Za-z_][A-Za-z0-9_]*=[^[:space:]]{16,}$|gh[pousr]_|github_pat_|nfp_)'

  TERM_PROGRAM=Apple_Terminal VSCODE_USER_TERMINAL=1 zsh -lic 'exit' > "$startup_log" 2>&1
  local status=$?

  if [ $status -ne 0 ]; then
    e_list "shell startup"
    error "login shell exited with status $status; output withheld"
    return $status
  fi

  if grep -Eq "$suspicious_output_pattern" "$startup_log"; then
    e_list "shell startup"
    error "login shell emitted secret-like output; output withheld"
    return 1
  fi

  c_list "shell startup"
)

# Check for dependency
dep() {
  type -p "$1" &> /dev/null
  local installed=$?
  if [ $installed -eq 0 ]; then
    c_list "$1"
  else
    e_list "$1"
  fi
  return $installed
}

install() {
  local file
  shopt -s dotglob nullglob
  for file in *; do
    if ! in_array "$file" "${excluded[@]}"; then
      # rsync -a handles files and directories uniformly:
      # files are updated in place; directories are merged so tool-managed
      # subdirs (e.g. .copilot/ide/) are preserved.
      rsync -a -- "$file" "$HOME/" || return 1
    fi
  done
}

in_array() {
  local hay needle=$1
  shift
  for hay; do
    [[ "$hay" == "$needle" ]] && return 0
  done
  return 1
}

#-----------------------------------------------------------------------------
# Initialize
#-----------------------------------------------------------------------------

dotfiles_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd) || exit 1
dependencies=(git zsh rsync)
excluded=(.git bootstrap.sh LICENSE.md README.md .DS_Store .vscode configs docs tests scripts node_modules package.json pnpm-lock.yaml pnpm-workspace.yaml Brewfile Brewfile.lock.json)


#-----------------------------------------------------------------------------
# Dependencies
#-----------------------------------------------------------------------------

notice "Checking dependencies"

not_met=0
for need in "${dependencies[@]}"; do
  dep "$need"
  met=$?
  not_met=$(( not_met + met ))
done

if [ $not_met -gt 0 ]; then
  error "$not_met dependencies not met!"
  exit 1
fi

#-----------------------------------------------------------------------------
# Install
#-----------------------------------------------------------------------------

cd -- "$dotfiles_root" || exit 1
notice "Installing"
if ! install; then
  error "installation failed"
  exit 1
fi

if [ -z "${SKIP_VERIFY:-}" ] && [ -z "${REMOTE_CONTAINERS:-}" ] && [ -z "${CODESPACES:-}" ]; then
  notice "Verifying shell startup"
  if ! verify_shell_startup; then
    error "shell startup verification failed"
    exit 1
  fi
fi

#-----------------------------------------------------------------------------
# Finished
#-----------------------------------------------------------------------------

notice "Done"
