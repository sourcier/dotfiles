export ZSH="/Users/$(whoami)/.oh-my-zsh"

# Theme settings
ZSH_THEME=powerlevel10k/powerlevel10k

# NVM settings
NVM_AUTO_USE=true

# Plugins
plugins=(git zsh-autosuggestions zsh-nvm zsh-syntax-highlighting)

source $ZSH/oh-my-zsh.sh
