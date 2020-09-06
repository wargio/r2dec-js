project('r2dec', 'c', meson_version: '>=0.46.0')

r2 = find_program('radare2', required: false)
cc = meson.get_compiler('c')

incs = []
deps = []

r2_incdir = get_option('r2_incdir')
if r2_incdir == '' and r2.found()
  r2_incdir = run_command(r2, '-H', 'INCDIR').stdout().strip()
endif

r2_libdir = get_option('r2_libdir')
if r2_libdir == '' and r2.found()
  r2_libdir = run_command(r2, '-H', 'LIBDIR').stdout().strip()
endif

libs = ['r_core', 'r_util', 'r_cons', 'r_config', 'r_io']
foreach lib : libs
  deps += cc.find_library(lib, dirs: r2_libdir)
endforeach

deps += cc.find_library('m', required: false)

if r2_incdir != ''
  incs += r2_incdir
  incs += r2_incdir + '/sdb'
endif

incs += 'duktape'

files = [
  'core_pdd.c',
  'duktape/duktape.c',
  'duktape/duk_console.c'
]

shared_library('core_pdd', files,
  dependencies: deps,
  include_directories: include_directories(incs),
  implicit_include_directories: false,
  install: true,
  install_dir: get_option('libdir')
)

dst = join_paths(get_option('datadir'), 'r2dec-js')
install_subdir(join_paths('..', 'libdec'), install_dir: dst)
install_subdir(join_paths('..', 'themes'), install_dir: dst)
install_data(join_paths('..', 'r2dec-duk.js'), install_dir: dst)
install_data(join_paths('..', 'require.js'), install_dir: dst)
