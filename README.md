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

### mise

```sh
brew install mise
```

[mise manages Node.js](https://mise.jdx.dev/lang/node.html).
After bootstrap, install the configured Node.js version:

```sh
mise install
mise exec -- node --version
```

The global configuration in `.config/mise/config.toml` pins Node.js 24.14.0
and enables existing `.nvmrc` and `.node-version` files. Projects can override
the default with their own version files or `mise.toml`. `engines.node` in
`package.json` does not select a Node.js version.

Interactive zsh sessions activate mise through `.env_mise`; login shells add
mise shims through `.zprofile` for non-interactive commands. Scripts that do
not load either startup file should use `mise exec -- <command>`.

Homebrew manages pnpm; `.env_pnpm` sets `PNPM_HOME` and adds its global
binaries to `PATH`. Install global CLIs with `pnpm add -g <package>`.
Install additional Node.js versions with `mise install node@<version>`.

Open a fresh terminal, run `mise doctor`, and check `command -v node`,
`node --version`, `pnpm --version`, and version switching inside projects.
Repeat in VS Code user and Copilot terminals.

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
brew bundle
chmod u+x bootstrap.sh
./bootstrap.sh
mise install
```

Bootstrap now verifies that a fresh zsh login shell does not emit secret-like output after installation.

After cloning, activate the commit message hook:

```sh
git config core.hooksPath .githooks
```

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
