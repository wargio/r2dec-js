include ./CONFIG

DEPENDS=
CROSSARCH=x64
PWD=$(shell pwd)
PACKAGE_DIR?=${PWD}

DOCKCROSS=$(PWD)/../dockcross
R2PLUGDIR=/usr/lib/radare2/$(VERSION)

all: root
	sudo rm -rf control data
	${MAKE} clean
	mkdir -p data
	cp -rf root/* data
	${MAKE} control
	${MAKE} deb

root:
	cd ../.. && $(MAKE) clean ; \
	$(DOCKCROSS) --image dockcross/linux-$(CROSSARCH) bash -c ' \
wget -c https://radare.mikelloc.com/get/3.4.1/radare2_3.4.1_amd64.deb ; \
wget -c https://radare.mikelloc.com/get/3.4.1/radare2-dev_3.4.1_amd64.deb ; \
sudo dpkg -i *.deb ; \
r2 -H; \
export CFLAGS=-DR2DEC_HOME=\"\\\"$(R2PLUGDIR)/r2dec-js\\\"\" ;\
 make'
	mkdir -p root/$(R2PLUGDIR)
	cp -f ../../core_pdd.so root/$(R2PLUGDIR)
	git clone ../../.. .r
	rm -rf .r/p .r/.git*
	mv .r root/$(R2PLUGDIR)/r2dec-js

purge: clean
	rm -rf root

summary:
	echo $(VERSION)

include deb.mk
