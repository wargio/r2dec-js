/* 
 * Copyright (C) 2017-2018 deroad
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

(function() { // lgtm [js/useless-expression]
	return {
		'6502': require('libdec/arch/6502'),
		'8051': require('libdec/arch/8051'),
		arm: require('libdec/arch/arm'),
		avr: require('libdec/arch/avr'),
		dalvik: require('libdec/arch/dalvik'),
		m68k: require('libdec/arch/m68k'),
		mips: require('libdec/arch/mips'),
		ppc: require('libdec/arch/ppc'),
		riscv: require('libdec/arch/riscv'),
		sh: require('libdec/arch/sh'),
		sparc: require('libdec/arch/sparc'),
		v850: require('libdec/arch/v850'),
		wasm: require('libdec/arch/wasm'),
		x86: require('libdec/arch/x86')
	};
});