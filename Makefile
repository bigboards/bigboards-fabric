VERSION ?= "snapshot"
ARCH = $(shell uname -m)
PROJECT = "bigboards-fabric"

all: dependencies package-tgz package-deb

clean:
	rm -rf code/node_modules
	rm -rf code/ui/bower_components

dependencies:
	cd code; npm install
	cd code/ui; bower install --config.interactive=false

install:
	install -d code $(DESTDIR)/usr/share/$(PROJECT)
	cd $(DESTDIR)/usr/share/bigboards-fabric; npm install
	cd $(DESTDIR)/usr/share/bigboards-fabric/ui; bower install --config.interactive=false

package-tgz:
	mkdir dist
	cd code; tar -xcf $(PROJECT)-$(VERSION).tar.gz -C ../dist/

package-deb:
	rm -rf /tmp/$(PROJECT)
    rsync -a deb/deb-src /tmp/$(PROJECT)
    rsync -a code/* /tmp/$(PROJECT)/sysroot/usr/share/$(PROJECT)/
    echo "${VERSION}" > /tmp/$(PROJECT)/sysroot/usr/share/$(PROJECT)/VERSION
    cd /tmp/$(PROJECT)/sysroot ; tar czf ../data.tar.gz *
    cd /tmp/$(PROJECT)/DEBIAN ; tar czf ../control.tar.gz *
    echo 2.0 > /tmp/$(PROJECT)/debian-binary
    cd /tmp/$(PROJECT)c; ar r ../$(PROJECT)-$(VERSION)-$(ARCH).deb debian-binary control.tar.gz data.tar.gz