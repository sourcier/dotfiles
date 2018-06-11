# Dotfiles

## Dependencies

### Install homebrew

```
$ /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

### Install oh-my-zsh

```
$ sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
```

Download powerlevel9k theme

```
$ git clone https://github.com/bhilburn/powerlevel9k.git ~/.oh-my-zsh/custom/themes/powerlevel9k
```

Dowloand Nerd font from: https://nerdfonts.com

### Install nvm

```
$ brew install nvm
```

### install jenv

```
brew install jenv
```

## Installation

```bash
$ git clone git@github.com:sourcier/dotfiles.git
$ cd dotfiles
$ chmod u+x bootstrap.sh
$ ./bootstrap.sh
```

Reload your terminal