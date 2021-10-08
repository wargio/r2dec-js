project('r2dec', 'c', meson_version: '>=0.46.0')

pyth = import('python').find_installation()
radare2 = find_program('radare2', required: false)
cc = meson.get_compiler('c')

    add_project_arguments('/MD', language: 'c')
incs = ['.']
deps = []
c_args = []

radare2_incdir = get_option('r2_incdir')
if radare2_incdir == '' and radare2.found()
  if host_machine.system() == 'windows'
    radare2_incdir = join_paths('..', 'prefix', 'include', 'libr')
  else
    radare2_incdir = run_command(radare2, '-H', 'R2_INCDIR').stdout().strip()
  endif
endif
  radare2_libdir = get_option('r2_libdir')
  if radare2_libdir == '' and radare2.found()
    radare2_libdir = run_command(radare2, '-H', 'R2_LIBDIR').stdout().strip()
  endif

radare2_plugdir = get_option('r2_plugdir')
if radare2_plugdir == '' and radare2.found()
  radare2_plugdir = run_command(radare2, '-H', 'R2_LIBR_PLUGINS').stdout().strip()
  if radare2_plugdir == ''
    radare2_plugdir = get_option('libdir')
  endif
endif

libs = ['r_core', 'r_util', 'r_cons', 'r_config', 'r_io']
foreach lib : libs
  deps += cc.find_library(lib, dirs: radare2_libdir)
endforeach

deps += cc.find_library('m', required: false)

if radare2_incdir != ''
  incs += radare2_incdir
  incs += join_paths(radare2_incdir, 'sdb')
endif

incs += 'duktape'

files = [
  'core_pdd.c',
  join_paths('duktape', 'duktape.c'),
  join_paths('duktape', 'duk_console.c')
]

jsc_folder = get_option('jsc_folder')

if jsc_folder != ''
  c_args += '-DUSE_JSC'
  generator_jsc = files('make_jsc.py')
  rc = run_command(pyth, generator_jsc, jsc_folder)
  if rc.returncode() != 0
    error('failed to generate jsc files.')
  endif
  r2dec_jsc = configuration_data()
  r2dec_jsc.set('JSC_SOURCES', rc.stdout())
  rz_version_h = configure_file(
    input: 'r2dec_jsc.c.in',
    output: 'r2dec_jsc.c',
    configuration: r2dec_jsc,
  )
endif

message('Radare2 Include Dir: ' + radare2_incdir)
message('Radare2 Library Dir: ' + radare2_libdir)
message('Radare2 Plugin Dir:  ' + radare2_plugdir)
if jsc_folder != ''
  message('JS to C Folder:    ' + jsc_folder)
endif

shared_library('core_pdd', files,
  c_args : c_args,
  dependencies: deps,
  include_directories: include_directories(incs),
  implicit_include_directories: false,
  install: true,
  install_dir: radare2_plugdir
)

if jsc_folder == ''
  dst = join_paths(get_option('datadir'), 'r2dec')
  install_subdir(join_paths('..', 'libdec'), install_dir: dst)
  install_subdir(join_paths('..', 'themes'), install_dir: dst)
  install_data(join_paths('..', 'r2dec-duk.js'), install_dir: dst)
  install_data(join_paths('..', 'require.js'), install_dir: dst)
endif
