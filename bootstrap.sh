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

verify_shell_startup() {
  local startup_log
  local suspicious_output_pattern
  startup_log=$(mktemp)
  suspicious_output_pattern='(^[A-Za-z_][A-Za-z0-9_]*=[^[:space:]]{16,}$|gh[pousr]_|github_pat_|nfp_)'

  TERM_PROGRAM=Apple_Terminal VSCODE_USER_TERMINAL=1 zsh -lic 'exit' > "$startup_log" 2>&1
  local status=$?

  if [ $status -ne 0 ]; then
    e_list "shell startup"
    cat "$startup_log"
    rm -f "$startup_log"
    return $status
  fi

  if grep -Eq "$suspicious_output_pattern" "$startup_log"; then
    e_list "shell startup"
    cat "$startup_log"
    rm -f "$startup_log"
    return 1
  fi

  rm -f "$startup_log"
  c_list "shell startup"
}

# Check for dependency
dep() {
  type -p $1 &> /dev/null
  local installed=$?
  if [ $installed -eq 0 ]; then
    c_list $1
  else
    e_list $1
  fi
  return $installed
}

install() {
  local files=( $(ls -a) )
  for file in "${files[@]}"; do
    in_array $file "${excluded[@]}"
    should_install=$?
    if [ $should_install -gt 0 ]; then
      [ -d "$HOME/$file" ] && rm -rf "$HOME/$file"
      cp -Rf "$file" "$HOME/$file"
    fi
  done
}

in_array() {
  local hay needle=$1
  shift
  for hay; do
    [[ $hay == $needle ]] && return 0
  done
  return 1
}

#-----------------------------------------------------------------------------
# Initialize
#-----------------------------------------------------------------------------

dotfiles_root=$PWD
dependencies=(git zsh)
excluded=(. .. .git bootstrap.sh LICENSE.md README.md .DS_Store .vscode configs docs Brewfile Brewfile.lock.json)


#-----------------------------------------------------------------------------
# Dependencies
#-----------------------------------------------------------------------------

notice "Checking dependencies"

not_met=0
for need in "${dependencies[@]}"; do
  dep $need
  met=$?
  not_met=$(echo "$not_met + $met" | bc)
done

if [ $not_met -gt 0 ]; then
  error "$not_met dependencies not met!"
  exit 1
fi

#-----------------------------------------------------------------------------
# Install
#-----------------------------------------------------------------------------

# Assumes $dotfiles_root is *ours*
if [ -d $dotfiles_root ]; then
  pushd $dotfiles_root

  # Install
  notice "Installing"
  install
else
  # Clone Repo
  notice "Downloading"
  git clone --recursive git@github.com:sourcier/dotfiles.git $dotfiles_root

  pushd $dotfiles_root

  # Backup
  notice "Backup up old files ($backupdir)"
  backup

  # Install
  notice "Installing"
  install
fi

notice "Verifying shell startup"
if ! verify_shell_startup; then
  error "shell startup verification failed"
  exit 1
fi

#-----------------------------------------------------------------------------
# Finished
#-----------------------------------------------------------------------------

popd
notice "Done"

#source "$HOME/.zshrc"
