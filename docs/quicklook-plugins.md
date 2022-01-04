# Permissions (Quarantine)

If you run into issues with macOS not letting you run the plugin because it's not signed by a verified developer you can follow these steps:

1. Install the plugin using one of the methods above
1. run `xattr -cr ~/Library/QuickLook/QLStephen.qlgenerator` (sudo if needed)
1. run `qlmanage -r`
1. run `qlmanage -r cache`
1. Restart Finder by...
    -  Restarting your computer
    -  or holding down the option key and right click on Finder’s dock icon, then select “Relaunch” from the menu
