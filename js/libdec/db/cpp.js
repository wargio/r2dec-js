// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

const _known_cpp_data = {
	'std::basic_string<char,std::char_traits<char>,std::allocator<char>>,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char>>>': 'std::string',
	'std::basic_stringstream<char,std::char_traits<char>,std::allocator<char>>::basic_stringstream': 'std::stringstream ',
	'std::basic_istringstream<char,std::char_traits<char>,std::allocator<char>>::basic_istringstream': 'std::istringstream ',
	'std::basic_ostringstream<char,std::char_traits<char>,std::allocator<char>>::basic_ostringstream': 'std::ostringstream ',
	'std::basic_stringstream<char,std::char_traits<char>,std::allocator<char>>::~basic_stringstream': 'std::~stringstream ',
	'std::basic_istringstream<char,std::char_traits<char>,std::allocator<char>>::~basic_istringstream': 'std::~istringstream ',
	'std::basic_ostringstream<char,std::char_traits<char>,std::allocator<char>>::~basic_ostringstream': 'std::~ostringstream ',
	'std::basic_string<char,std::char_traits<char>,std::allocator<char>>::basic_string': 'std::string ',
	'std::basic_string<char,std::char_traits<char>,std::allocator<char>>::~basic_string': 'std::~string ',
	'std::basic_string<char,std::char_traits<char>,std::allocator<char>>': 'std::string ',
	'std::basic_ostream<char,std::char_traits<char>>': 'std::string ',
	'std::basic_istream<char,std::char_traits<char>>': 'std::string ',

	'operatordelete(void*)': 'delete',

	'<char,std::char_traits<char>,std::allocator<char>>': ' ',
	'<std::char_traits<char>>': 'std::string ',

	'std::_Ios_Openmode': 'std::ios_base::openmode ',

	'&std::operator>>': '& std::operator >> ',
	'&std::operator<<': '& std::operator << ',
	'&std::operator[]': '& std::operator [] ',
	'&std::operator|': '& std::operator | ',
	'&std::operator+': '& std::operator + ',
	'&std::operator+=': '& std::operator += ',

	'operator>>': 'operator >> ',
	'operator<<': 'operator << ',
	'operator[]': 'operator [] ',
	'operator|': 'operator | ',

	'std::stringconst': 'std::string const',
	'unsignedlong': 'unsigned long',
	'longlong': 'long long',
	'charconst': 'char const',
};

export default function(str) {
	str = str.replace(/::_cxx\d\d::/g, '::').replace(/\s+/g, '');
	for (var key in _known_cpp_data) {
		if (str.indexOf(key) >= 0) {
			var find = new RegExp(key.replace(/([()[\]|\\*+])/g, '\\$1'), 'g');
			str = str.replace(find, _known_cpp_data[key]);
		}
	}
	return str;
}