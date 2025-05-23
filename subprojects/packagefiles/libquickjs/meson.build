project('quickjs-ng', 'c',
  version: 'v0.8.0',
  default_options: [
    'buildtype=release',
    'b_vscrt=from_buildtype',
    'warning_level=1',
    'c_std=c11'
  ]
)

cc = meson.get_compiler('c')

threads_dep = dependency('threads')
atomic_dep = cc.find_library('atomic', required: false)
dl_dep = cc.find_library('dl', required: false)
m_dep = cc.find_library('m', required: false)

sources = [
  'cutils.c',
  'libbf.c',
  'libregexp.c',
  'libunicode.c',
  'quickjs.c',
]

compiler_flags = [
  '-fvisibility=hidden',
  '-fvisibility-inlines-hidden',
  '-Wno-implicit-fallthrough',
  '-Wno-sign-compare',
  '-Wno-missing-field-initializers',
  '-Wno-unused-parameter',
  '-Wno-unused-but-set-variable',
  '-Wno-array-bounds',
  '-Wno-format-truncation',
  '-Wno-format-zero-length',
  '-funsigned-char',
]

if cc.get_id() == 'msvc'
    compiler_flags += '-Wno-unsafe-buffer-usage'
    compiler_flags += '-Wno-sign-conversion'
    compiler_flags += '-Wno-nonportable-system-include-path'
    compiler_flags += '-Wno-implicit-int-conversion'
    compiler_flags += '-Wno-shorten-64-to-32'
    compiler_flags += '-Wno-reserved-macro-identifier'
    compiler_flags += '-Wno-reserved-identifier'
    compiler_flags += '-Wdeprecated-declarations'
    compiler_flags += '/experimental:c11atomics'
    compiler_flags += '/wd4018' # -Wno-sign-conversion
    compiler_flags += '/wd4061' # -Wno-implicit-fallthrough
    compiler_flags += '/wd4100' # -Wno-unused-parameter
    compiler_flags += '/wd4200' # -Wno-zero-length-array
    compiler_flags += '/wd4242' # -Wno-shorten-64-to-32
    compiler_flags += '/wd4244' # -Wno-shorten-64-to-32
    compiler_flags += '/wd4245' # -Wno-sign-compare
    compiler_flags += '/wd4267' # -Wno-shorten-64-to-32
    compiler_flags += '/wd4388' # -Wno-sign-compare
    compiler_flags += '/wd4389' # -Wno-sign-compare
    compiler_flags += '/wd4710' # Function not inlined
    compiler_flags += '/wd4711' # Function was inlined
    compiler_flags += '/wd4820' # Padding added after construct
    compiler_flags += '/wd4996' # -Wdeprecated-declarations
    compiler_flags += '/wd5045' # Compiler will insert Spectre mitigation for memory load if /Qspectre switch specified
endif

# required on linux, but ignored by windows
quickjs_c_args = ['-D_GNU_SOURCE=1']

foreach flag: compiler_flags
  if cc.has_argument(flag)
    quickjs_c_args += flag
  endif
endforeach

quickjs = static_library('quickjs', sources,
  dependencies: [atomic_dep, threads_dep, dl_dep, m_dep],
  c_args: quickjs_c_args,
  pic: true,
  gnu_symbol_visibility: 'hidden',
  implicit_include_directories: false,
  install: false
)

quickjs_dep = declare_dependency(
  link_with: quickjs,
  include_directories: include_directories('.'),
)
