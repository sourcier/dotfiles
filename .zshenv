for file in ~/.env_*(N); do
  [[ -f "$file" ]] && source "$file"
done
