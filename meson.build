project('r2dec', 'c', meson_version: '>=0.46.0')

r2 = find_program('radare2')
cc = meson.get_compiler('c')

incs = []
deps = []
dirs = []

incdir = run_command(r2, '-H', 'INCDIR').stdout().strip()
if build_machine.system() == 'windows'
  cmd = 'print(__import__("os").path.dirname(r"@0@"))'.format(r2.path())
  root = run_command('python', '-c', cmd).stdout().strip()
  incs += join_paths(root, incdir)
  if cc.get_id() == 'msvc'
    incs += join_paths(root, incdir, 'msvc')
  endif
else
  incs += incdir
endif

libdir = run_command(r2, '-H', 'LIBDIR').stdout().strip()
if build_machine.system() == 'windows'
  dirs += [root, join_paths(root, libdir)]
else
  dirs += libdir
endif

libs = ['r_core', 'r_util', 'r_cons', 'r_config', 'r_io']
foreach lib : libs
  set_variable(lib, cc.find_library(lib, dirs: dirs))
  deps += get_variable(lib)
endforeach

deps += cc.find_library('m', required: false)

incs += 'duktape'

files = [
  'core_pdd.c',
  'duktape/duktape.c',
  'duktape/duk_console.c'
]

shared_library('core_pdd', files,
  dependencies: deps,
  include_directories: include_directories(incs),
  implicit_include_directories: false
)
