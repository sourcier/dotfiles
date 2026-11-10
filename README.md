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
After bootstrap, install the configured Node.js and pnpm versions:

```sh
mise install
mise exec -- node --version
```

The global configuration in `.config/mise/config.toml` sets the default Node.js
version, manages pnpm, and enables existing `.nvmrc` and `.node-version` files.
Projects can override the Node.js default with their own version files or `mise.toml`.
`engines.node` in `package.json` does not select a Node.js version.

Interactive zsh sessions activate mise through `.env_mise`; login shells add
mise shims through `.zprofile` for non-interactive commands. Scripts that do
not load either startup file should use `mise exec -- <command>`.

`.env_pnpm` sets `PNPM_HOME` and adds global package binaries to `PATH`.
Install global CLIs with `pnpm add -g <package>`. Install additional Node.js
versions with `mise install node@<version>`.

Open a fresh terminal, run `mise doctor`, and check `command -v node`,
`node --version`, `mise which pnpm`, and `pnpm --version`. Also verify Node.js
version switching inside projects. Repeat in VS Code user and Copilot terminals.

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

Bootstrap copies files from the repository directory, even when invoked from
elsewhere, and stops if a copy fails. It verifies that a fresh zsh login shell
does not emit secret-like output; captured output is withheld on failure.

After cloning, activate the commit message hook:

```sh
git config core.hooksPath .githooks
```

Run `brew bundle` to install apps from the `Brewfile`, then reload your terminal.

Run the regression checks without modifying your home directory:

```sh
bash tests/run.sh
```

Port utilities inspect TCP listeners on IPv4 and IPv6:

```sh
whatsonport 3000
stoponport 3000
```

`stoponport` sends SIGTERM to each listener; it does not force-kill processes.

## Config

### AI tools and terminals

In VS Code's **User Settings (JSON)**, merge this setting so user-created
terminals retain prompts and normal Keychain loading:

```json
{
  "terminal.integrated.env.osx": {
    "VSCODE_USER_TERMINAL": "1"
  }
}
```

Non-TTY command shells and VS Code agent terminals skip Oh My Zsh, prompts,
and automatic Keychain loading. For other agent launchers that allocate a TTY,
set `DOTFILES_AGENT=1` in the launch environment. This only prevents fresh
Keychain loading; credentials inherited from the parent process remain available.

Install the shared Playwright MCP executable:

```sh
pnpm add -g @playwright/mcp
```

Copilot and OpenCode launch it through a non-interactive login shell using
`$HOME/Library/pnpm/playwright-mcp`, so they do not depend on an inherited
interactive `PATH`. Restart AI tools after updating their configuration.

### Git identity

Set your default name and email in `.gitconfig`. For a project-specific identity,
use `git config --local user.name` and `git config --local user.email` with the
appropriate values, or configure conditional includes in `.gitconfig`.

### PostgreSQL

Install `postgresql@16` with Homebrew if needed. `.env_postgresql` adds its
executables to `PATH` only when that version is installed.

### SSH

Update `~/.ssh/config`:

```
Host *
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
```

### Secrets Management

Private environment variables are stored in the macOS Keychain and exported
automatically only in human terminal sessions. Agent command shells can load
individual credentials explicitly without printing them:

```sh
secret-load GITHUB_TOKEN
```

```sh
secret-set GITHUB_TOKEN ghp_abc123...   # store a secret
secret-get GITHUB_TOKEN                 # retrieve a secret
secret-list                             # list all managed secrets
secret-del GITHUB_TOKEN                 # remove a secret
```

Secret names must be valid shell environment variable names such as `GITHUB_TOKEN`.

All secrets are namespaced under `env-secret:` in the keychain to avoid
collisions with other entries. The tracked `.env_secrets` file contains only
shell functions, not secret values.

### dnsmasq

Route all `.test` domains to localhost for local development.

```sh
brew install dnsmasq
echo 'address=/.test/127.0.0.1' > $(brew --prefix)/etc/dnsmasq.conf
sudo mkdir /etc/resolver
sudo bash -c 'echo "nameserver 127.0.0.1" > /etc/resolver/test'
sudo brew services start dnsmasq
```
