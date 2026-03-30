# Skip shell customizations in Copilot agent terminals.
# VS Code injects VSCODE_USER_TERMINAL=1 into user-created terminals (via settings.json).
# Copilot agent terminals don't get that injection, so we use it to tell them apart.
# Fallback: if the env var is missing entirely (e.g. non-VS Code), check TERM_PROGRAM.
if [[ "$TERM_PROGRAM" != "vscode" || -n "$VSCODE_USER_TERMINAL" ]]; then
  # Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
  # Initialization code that may require console input (password prompts, [y/n]
  # confirmations, etc.) must go above this block; everything else may go below.
  if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
    source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
  fi

  source ~/.zsh

  # To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
  [[ -f ~/.p10k.zsh ]] && source ~/.p10k.zsh

  # source all files that begin with .env_
  for file in ~/.env_* ; do
      source "$file"
  done

  source ~/.aliases
fi
