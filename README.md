# Dotfiles

## Dependencies

### Install homebrew

```
$ /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

#### Useful packages

* coreutils
* gnu-sed

### Install oh-my-zsh

```
$ sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
```

Download powerlevel9k theme

```
$ git clone https://github.com/bhilburn/powerlevel9k.git ~/.oh-my-zsh/custom/themes/powerlevel9k
```

Dowloand Nerd font from: https://nerdfonts.com

## Installation

```bash
$ git clone git@github.com:sourcier/dotfiles.git
$ cd dotfiles
$ chmod u+x bootstrap.sh
$ ./bootstrap.sh
```

Reload your terminal

## Config

## zsh-autosuggestions

```bash
$ git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

Add the plugin to the list of plugins for Oh My Zsh to load (inside ~/.zshrc):

```
plugins=(zsh-autosuggestions)
```

### nvm

```
$ brew install nvm
$ nvm install stable
```
