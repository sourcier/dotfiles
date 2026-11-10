export ZSH="$HOME/.oh-my-zsh"

# Theme settings
ZSH_THEME=powerlevel10k/powerlevel10k

# Plugins
plugins=(git zsh-autosuggestions zsh-syntax-highlighting)

if [[ -r "$ZSH/oh-my-zsh.sh" ]]; then
  source "$ZSH/oh-my-zsh.sh"
fi
