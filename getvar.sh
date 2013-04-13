# Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
# Use of this source code is governed by the GNU General Public License
# as published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.

set -o nounset
set -o errexit

source common.sh

if [ -z "${1:-}" ]; then
  exit 1
fi

case "$1" in
  SENTINELS)
    sentinels_dir=${NACLPORTS_ROOT}/src/out/sentinels
    if [ ${NACL_DEBUG} = "1" ]; then
      echo ${sentinels_dir}/${NACL_ARCH}_debug
    else
      echo ${sentinels_dir}/${NACL_ARCH}
    fi
    ;;
  NACL_LIBC)
    if [ ${NACL_GLIBC} = "1" ]; then
      echo glibc
    else
      echo newlib
    fi
    ;;
  *)
    eval "echo \$$1"
esac
