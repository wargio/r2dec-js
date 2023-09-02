// SPDX-FileCopyrightText: 2017-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import _6502 from './arch/6502.js';
import _8051 from './arch/8051.js';
import arm from './arch/arm.js';
import avr from './arch/avr.js';
import dalvik from './arch/dalvik.js';
import m68k from './arch/m68k.js';
import mips from './arch/mips.js';
import ppc from './arch/ppc.js';
import riscv from './arch/riscv.js';
import sh from './arch/sh.js';
import sparc from './arch/sparc.js';
import v850 from './arch/v850.js';
import wasm from './arch/wasm.js';
import x86 from './arch/x86.js';

export default {
	'6502': _6502,
	'8051': _8051,
	arm: arm,
	avr: avr,
	dalvik: dalvik,
	m68k: m68k,
	mips: mips,
	ppc: ppc,
	riscv: riscv,
	sh: sh,
	sparc: sparc,
	v850: v850,
	wasm: wasm,
	x86: x86
};
