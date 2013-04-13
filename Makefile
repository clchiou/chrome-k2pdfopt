# Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
# Use of this source code is governed by the GNU General Public License
# as published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.

all:
	NACL_PACKAGES_BITSIZE=32 $(MAKE) arch
	NACL_PACKAGES_BITSIZE=64 $(MAKE) arch

arch: | k2pdfopt

.PHONY: all arch

include packages.mk
