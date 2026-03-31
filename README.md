# Dotfiles

## Dependencies

### Install homebrew

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
### Install oh-my-zsh

```sh
sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
```

Download Powerlevel10k theme

```sh
git clone https://github.com/romkatv/powerlevel10k.git $ZSH_CUSTOM/themes/powerlevel10k
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

```sh
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

Add the plugin to the list of plugins for Oh My Zsh to load (inside ~/.zshrc):

```
plugins=(zsh-autosuggestions)
```

### zsh-syntax-highlighting
```sh
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

Add the plugin to the list of plugins for Oh My Zsh to load (inside ~/.zshrc):

```
plugins=(zsh-autosuggestions)
```

# fnm

```sh
brew install fnm
```

Add the following to your .zshrc profile:

```sh
eval "$(fnm env --use-on-cd)"
```

## bun

```sh
brew tap oven-sh/bun
brew install bun
```

## Secrets Management

Private environment variables are stored in the macOS Keychain and exported automatically on shell startup. Secrets never exist as plaintext on disk.

### Store a secret

```sh
secret-set GITHUB_TOKEN ghp_abc123...
```

### Retrieve a secret

```sh
secret-get GITHUB_TOKEN
```

### List all managed secrets

```sh
secret-list
```

### Remove a secret

```sh
secret-del GITHUB_TOKEN
```

All secrets are namespaced under `env-secret:` in the keychain to avoid collisions with other entries. The `.env_secrets` file is git-ignored and safe to sync across machines — it contains no secret values, only the shell functions that read from the keychain.

## Bootstrap

```sh
git clone git@github.com:sourcier/dotfiles.git
cd dotfiles
chmod u+x bootstrap.sh
./bootstrap.sh
```

Run ```brew bundle``` to setup apps from ```Brewfile```

Reload your terminal
