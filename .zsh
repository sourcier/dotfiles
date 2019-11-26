export ZSH="/Users/$(whoami)/.oh-my-zsh"

# History settings
HISTSIZE=1024
SAVEHIST=$HISTSIZE
HISTORY_IGNORE="(ls|cd|pwd|exit|date|clear|* --help)"
setopt HIST_IGNORE_ALL_DUPS
setopt HIST_IGNORE_SPACE

# Theme settings
ZSH_THEME=powerlevel10k/powerlevel10k

# NVM settings
NVM_AUTO_USE=true

# Plugins
plugins=(git zsh-autosuggestions zsh-nvm)

source $ZSH/oh-my-zsh.sh
