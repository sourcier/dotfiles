source ~/.zsh

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ -f ~/.p10k.zsh ]] && source ~/.p10k.zsh

# source all files that begin with .env_
for file in ~/.env_* ; do
    source "$file"
done

source ~/.aliases
