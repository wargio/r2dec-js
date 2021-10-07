import sys
import glob
import os
import json

def const_var_name(name):
	return 'jsc_' + name.replace(os.sep, '_').replace('.', '_').replace('-', '_')

def main(argc, argv):
	if argc != 2:
		print("usage: {} <path/to/js/files>".format(argv[0]))
		sys.exit(1)
	path = os.path.join(argv[1])
	path_len = len(argv[1])

	js_files = glob.glob(os.path.join(path, '**/*.js'), recursive=True)
	js_files.remove(os.path.join(path, 'r2dec-test.js'))

	for file in js_files:
		vname = const_var_name(file[path_len + 1:])
		code = ''
		count = 0
		with open(file, "rb") as f:
			raw = f.read()
			for byte in raw:
				if count > 0 and count % 32 == 0:
					code += "\n\t"
				code += "{}, ".format(byte)
				count += 1
		print('const unsigned char ' + vname + '[' + str(count + 1) + '] = {\n\t' + code + ' 0\n};\n')

	print('\n#define R2_JSC_SIZE ({})\n\n'.format(len(js_files)))
	print('const R2JSC r_jsc_file[R2_JSC_SIZE] = {')
	for file in js_files:
		name = file[path_len + 1:].replace(os.sep, '/')
		vname = const_var_name(file[path_len + 1:])
		print('\t{ .name = "' + name + '", .code = (const char *)' + vname + ' },')
	print('};')

if __name__ == '__main__':
	main(len(sys.argv), sys.argv)
