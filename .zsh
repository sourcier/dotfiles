export ZSH=/Users/roger/.oh-my-zsh

# History settings
HISTSIZE=1024
SAVEHIST=$HISTSIZE
HISTORY_IGNORE="(ls|cd|pwd|exit|date|* --help)"
setopt HIST_IGNORE_ALL_DUPS

# Theme settings
POWERLEVEL9K_DISABLE_RPROMPT=true
POWERLEVEL9K_MODE='nerdfont-complete'
ZSH_THEME="powerlevel9k/powerlevel9k"

# Plugins
plugins=(git)

source $ZSH/oh-my-zsh.sh
