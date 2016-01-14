VERSION ?= "snapshot"

all: dependencies package-tgz

clean:
	rm -rf code/node_modules
	rm -rf code/ui/bower_components

dependencies:
	cd code; npm install
	cd code/ui; bower install --config.interactive=false

install:
	install -d code $(DESTDIR)/usr/share/bigboards/fabric
	cd $(DESTDIR)/usr/share/bigboards/fabric; npm install
	cd $(DESTDIR)/usr/share/bigboards/fabric/ui; bower install --config.interactive=false

package-tgz:
	mkdir dist
	cd code; tar -xcf bigboards-fabric-${VERSION}.tar.gz -C ../dist/