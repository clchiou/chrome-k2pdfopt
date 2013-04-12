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
