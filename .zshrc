# Agent command shells need tools, not Oh My Zsh, plugins, or prompts.
if [[ -o interactive && -t 0 && -t 1 && "${DOTFILES_AGENT:-0}" != 1 &&
      ( "$TERM_PROGRAM" != "vscode" || -n "$VSCODE_USER_TERMINAL" ) ]]; then
  # Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
  # Initialization code that may require console input (password prompts, [y/n]
  # confirmations, etc.) must go above this block; everything else may go below.
  if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
    source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
  fi

  source ~/.zsh

  # To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
  [[ -f ~/.p10k.zsh ]] && source ~/.p10k.zsh

fi

source ~/.aliases
