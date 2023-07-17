#!/bin/bash
# +-----------------+
# | npm postinstall |
# | @bugsounet      |
# +-----------------+

# get the installer directory
Installer_get_current_dir () {
  SOURCE="${BASH_SOURCE[0]}"
  while [ -h "$SOURCE" ]; do
    DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
  done
  echo "$( cd -P "$( dirname "$SOURCE" )" && pwd )"
}

Installer_dir="$(Installer_get_current_dir)"

# move to installler directory
cd "$Installer_dir"

source utils.sh

Installer_info "Minify Main code..."
node minify.js || {
  Installer_error "Minify Failed!"
  exit 255
}
Installer_success "Done"
echo

# module name
Installer_module="EXT-TelegramBot"

Installer_info "Install Emojis..."
mkdir ~/.fonts &>/dev/null
cp -f *.ttf ~/.fonts/
fc-cache -f -v &>/dev/null
Installer_success "Done"
echo

Installer_info "$Installer_module is now installed !"
