/* 
 * Copyright (C) 2019 deroad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() {
	var XReference = function(strings, symbols) {
		this.db_strings = strings;
		this.db_symbols = symbols;
		this.find_symbol = function(address) {
			if (!address) {
				return null;
			}
			return symbols.search(address);
		};
		this.find_string = function(address) {
			if (!address) {
				return null;
			}
			return strings.search(address);
		};
	};
	return XReference;
});