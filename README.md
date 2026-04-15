# Dotfiles

## Dependencies

### Homebrew

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Oh My Zsh

```sh
sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
```

### Powerlevel10k

```sh
git clone https://github.com/romkatv/powerlevel10k.git $ZSH_CUSTOM/themes/powerlevel10k
```

Download and install the [Meslo Nerd Font](https://github.com/romkatv/powerlevel10k#meslo-nerd-font-patched-for-powerlevel10k).

### zsh-autosuggestions

```sh
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
```

### zsh-syntax-highlighting

```sh
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

Add both plugins to Oh My Zsh (inside `~/.zshrc`):

```
plugins=(zsh-autosuggestions zsh-syntax-highlighting)
```

### fnm

```sh
brew install fnm
```

### bun

```sh
brew install bun
```

### SDKMAN

```sh
curl -s "https://get.sdkman.io" | bash
```

## Bootstrap

```sh
git clone git@github.com:sourcier/dotfiles.git
cd dotfiles
chmod u+x bootstrap.sh
./bootstrap.sh
```

Bootstrap now verifies that a fresh zsh login shell does not emit secret-like output after installation.

Run `brew bundle` to install apps from the `Brewfile`, then reload your terminal.

## Config

### SSH

Update `~/.ssh/config`:

```
Host *
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
```

### Secrets Management

Private environment variables are stored in the macOS Keychain and exported automatically on shell startup. Secrets never exist as plaintext on disk.

```sh
secret-set GITHUB_TOKEN ghp_abc123...   # store a secret
secret-get GITHUB_TOKEN                 # retrieve a secret
secret-list                             # list all managed secrets
secret-del GITHUB_TOKEN                 # remove a secret
```

Secret names must be valid shell environment variable names such as `GITHUB_TOKEN`.

All secrets are namespaced under `env-secret:` in the keychain to avoid collisions with other entries. The `.env_secrets` file is git-ignored and safe to sync across machines — it contains no secret values, only the shell functions that read from the keychain.

### dnsmasq

Route all `.test` domains to localhost for local development.

```sh
brew install dnsmasq
echo 'address=/.test/127.0.0.1' > $(brew --prefix)/etc/dnsmasq.conf
sudo mkdir /etc/resolver
sudo bash -c 'echo "nameserver 127.0.0.1" > /etc/resolver/test'
sudo brew services start dnsmasq
```
