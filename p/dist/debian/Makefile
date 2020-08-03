include ./CONFIG

DEPENDS=
CROSSARCH=x64
PWD=$(shell pwd)
PACKAGE_DIR?=${PWD}
R2_PLUGIN_DIR=$(shell radare2 -H R2_LIBR_PLUGINS)


all: root
	sudo rm -rf control data
	${MAKE} clean
	mkdir -p data
	cp -rf root/* data
	${MAKE} control
	${MAKE} deb

root:
	export CFLAGS=-DR2DEC_HOME=\"\\\"$(R2_PLUGIN_DIR)/r2dec-js\\\"\" && make -C ../..
	mkdir -p root/$(R2_PLUGIN_DIR)/r2dec-js
	cp -vf ../../core_pdd.so root/$(R2_PLUGIN_DIR)
	cp -vfr ../../../libdec root/$(R2_PLUGIN_DIR)/r2dec-js

purge: clean
	rm -rf root

summary:
	echo $(VERSION)

include deb.mk
