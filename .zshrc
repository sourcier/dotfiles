source ~/.zsh

# source all files that begin with .env_
for file in ~/.env_* ; do
    source "$file"
done

source ~/.aliases
