meson b --prefix=/ --wipe --buildtype=debug -Djsc_folder=".."
REM meson b --prefix=/ --wipe --buildtype=debug -Db_sanitize=address
ninja -C b
