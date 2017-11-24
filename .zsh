export ZSH=/Users/rrajaratnam/.oh-my-zsh

# Theme settings
POWERLEVEL9K_MODE="nerdfont-complete"
POWERLEVEL9K_SHOW_CHANGESET=true
POWERLEVEL9K_PROMPT_ON_NEWLINE=true
POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(context dir rbenv vcs)
POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(status root_indicator background_jobs history)
DEFAULT_USER=$USER
ZSH_THEME="powerlevel9k/powerlevel9k"

# History settings
HISTSIZE=512
SAVEHIST=$HISTSIZE
HISTCONTROL=ignoreboth
HISTIGNORE="ls:cd:pwd:exit:date:* --help"

# Plugins
plugins=(git)

source $ZSH/oh-my-zsh.sh
