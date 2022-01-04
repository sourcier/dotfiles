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

Download Powerlevel10k theme

```
$ git clone https://github.com/romkatv/powerlevel10k.git $ZSH_CUSTOM/themes/powerlevel10k
```

Download and install nerd font from [here](https://github.com/romkatv/powerlevel10k#meslo-nerd-font-patched-for-powerlevel10k).

## Config

### SSH

Update ssh config file `~/.ssh/config`

```
Host *
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
```

### zsh-autosuggestions

```bash
$ git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

Add the plugin to the list of plugins for Oh My Zsh to load (inside ~/.zshrc):

```
plugins=(zsh-autosuggestions)
```

### zsh-syntax-highlighting
```
$ git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

Add the plugin to the list of plugins for Oh My Zsh to load (inside ~/.zshrc):

```
plugins=(zsh-autosuggestions)
```

### nvm

```
$ git clone https://github.com/lukechilds/zsh-nvm ~/.oh-my-zsh/custom/plugins/zsh-nvm
```

Add the plugin to the list of plugins for Oh My Zsh to load (inside ~/.zshrc):

```
$ plugins=(zsh-nvm)
```

## Bootstrap

```bash
$ git clone git@github.com:sourcier/dotfiles.git
$ cd dotfiles
$ chmod u+x bootstrap.sh
$ ./bootstrap.sh
```

Run ```brew bundle``` to setup apps from ```Brewfile```

Reload your terminal
