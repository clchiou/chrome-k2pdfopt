# Copyright (c) 2013 Che-Liang Chiou. All rights reserved.
# Use of this source code is governed by the GNU General Public License
# as published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.

set -o nounset
set -o errexit

if [ -z "${1:-}" ]; then
  exit 1
fi

if [ "${NACL_GLIBC:-}" = "1" ]; then
  nacl_libc=glibc
else
  nacl_libc=newlib
fi

# Because ${NACLPORTS_ROOT}/src/build_tools/nacl_env.sh parses command-line
# arguments, we should empty arguments before (indirectly) calling nacl_env.sh
command="$1"
shift

# XXX ${NACLPORTS_ROOT}/src/build_tools/common.sh is buggy(?) that when
# PACKAGE_NAME is unset, it crashes instead of detecting this...
if [ -z "${PACKAGE_NAME:-}" ]; then
  export PACKAGE_NAME=dummy
fi

# XXX ${NACLPORTS_ROOT}/src/build_tools/common.sh emits output...
# Just shut it up!
source common.sh > /dev/null

case "${command}" in
  SENTINELS)
    sentinels_dir=${NACLPORTS_ROOT}/src/out/sentinels
    if [ ${NACL_DEBUG} = "1" ]; then
      echo ${sentinels_dir}/${NACL_ARCH}_${nacl_libc}_debug
    else
      echo ${sentinels_dir}/${NACL_ARCH}_${nacl_libc}
    fi
    ;;
  NACL_LIBC)
    echo ${nacl_libc}
    ;;
  *)
    eval "echo \$${command}"
esac
