export ZSH=/Users/roger/.oh-my-zsh

# History settings
HISTSIZE=1024
SAVEHIST=$HISTSIZE
HISTORY_IGNORE="(ls|cd|pwd|exit|date|* --help)"
setopt HIST_IGNORE_ALL_DUPS

# Theme settings
ZSH_THEME="robbyrussell"

# Plugins
plugins=(git)

source $ZSH/oh-my-zsh.sh
