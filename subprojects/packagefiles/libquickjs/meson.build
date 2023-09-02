project('quickjs', 'c',
  version: '2021-03-27-frida',
)

cc = meson.get_compiler('c')

have_msvc = cc.get_id() == 'msvc'

threads_dep = dependency('threads')
dl_dep = cc.find_library('dl', required: false)
m_dep = cc.find_library('m', required: false)

headers = [
  'quickjs.h',
]

sources = [
  'quickjs.c',
  'libregexp.c',
  'libunicode.c',
  'cutils.c',
  'libbf.c',
]

cdata = configuration_data()
cdata.set_quoted('CONFIG_VERSION', meson.project_version())

if host_machine.endian() == 'big'
  cdata.set('WORDS_BIGENDIAN', 1)
endif

if cc.has_header('unistd.h')
  cdata.set('HAVE_UNISTD_H', 1)
endif

if cc.has_function('malloc_usable_size')
  cdata.set('HAVE_MALLOC_USABLE_SIZE', 1)
endif

if get_option('libc')
  headers += 'quickjs-libc.h'
  sources += 'quickjs-libc.c'
endif

cdata.set('CONFIG_BIGNUM', get_option('bignum'))

atomics = false
opt = get_option('atomics')
if not opt.disabled()
  if opt.auto()
    atomics = not have_msvc
  elif not have_msvc
    atomics = true
  else
    error('Atomics support was requested but is not available')
  endif
endif
cdata.set('CONFIG_ATOMICS', atomics)

stack_check = false
opt = get_option('stack_check')
if not opt.disabled()
  if opt.auto()
    stack_check = not have_msvc
  elif not have_msvc
    stack_check = true
  else
    error('Stack limitation was requested but is not available')
  endif
endif
cdata.set('CONFIG_STACK_CHECK', stack_check)

configure_file(
  output: 'config.h',
  configuration: cdata,
)

add_project_arguments(
  have_msvc ? '/FI' : '-include', meson.current_build_dir() / 'config.h',
  '-D_GNU_SOURCE=1',
  language: 'c',
)

quickjs = static_library('quickjs', sources,
  dependencies: [threads_dep, dl_dep, m_dep],
  implicit_include_directories: false,
  install: false,
)
quickjs_dep = declare_dependency(
  link_with: quickjs,
  include_directories: include_directories('.'),
)

qjsc_sources = [
  'qjsc.c',
  'quickjs-libc.c',
]

qjsc = executable('qjsc', qjsc_sources,
  dependencies: quickjs_dep,
  include_directories: include_directories('.'),
  implicit_include_directories: false,
  install: false,
)
