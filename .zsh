export ZSH=/Users/rrajaratnam/.oh-my-zsh

# History settings
export HISTSIZE=512
export SAVEHIST=$HISTSIZE
export HISTCONTROL=ignoreboth
export HISTIGNORE="ls:cd:pwd:exit:date:* --help"

# Theme settings
POWERLEVEL9K_MODE="nerdfont-complete"
POWERLEVEL9K_SHOW_CHANGESET=true
POWERLEVEL9K_CHANGESET_HASH_LENGTH=7
POWERLEVEL9K_PROMPT_ON_NEWLINE=true
POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(context dir rbenv vcs)
POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(status root_indicator background_jobs history)
DEFAULT_USER=$USER
ZSH_THEME="powerlevel9k/powerlevel9k"

# Plugins
plugins=(git)

source $ZSH/oh-my-zsh.sh
