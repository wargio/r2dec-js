// SPDX-FileCopyrightText: 2025
// SPDX-License-Identifier: BSD-3-Clause

import Base from './base.js';

/**
 * The optimizer is a best-effort, readability-first post-pass.
 *
 * Important constraints:
 * - r2dec "code" objects often stringify with ANSI color codes enabled.
 * - instructions can carry composed statements (multiple "code lines").
 * - conditional jumps store their condition in `instr.cond` (not always in `instr.code`).
 *
 * The optimizer therefore works on a "plain" (decolored) view of statements for analysis,
 * and writes back using `Base.special()` to keep coloring via `printer.auto()`.
 */

const ANSI_RE = /\u001b\[[0-9;]*m/g;
let _bpRegsCache = null;

function stripAnsi(s) {
	return (s || '').replace(ANSI_RE, '');
}

function getBasePointerRegisters() {
	if (_bpRegsCache) return _bpRegsCache;
	const out = [];
	try {
		if (typeof radare2 !== 'undefined' && radare2 && radare2.command) {
			const s = (radare2.command('arp~BP[1]') || '').trim();
			// `arp~BP[1]` typically prints the BP register name (e.g. `x29`).
			s.split(/\r?\n/).map(x => x.trim()).filter(Boolean).forEach(x => out.push(x));
		}
	} catch (e) {
		// ignore
	}
	// Fallbacks (in case `arp` isn't available or returns empty).
	if (out.length === 0) {
		out.push('x29', 'rbp', 'ebp');
	}
	_bpRegsCache = out;
	return _bpRegsCache;
}

function isBasePointerRegister(name) {
	if (!name) return false;
	const n = String(name).trim();
	const regs = getBasePointerRegisters();
	for (let i = 0; i < regs.length; i++) {
		if (regs[i] === n) return true;
	}
	return false;
}

function asPlainString(value) {
	if (value === undefined || value === null) {
		return '';
	}
	if (typeof value === 'string') {
		return stripAnsi(value);
	}
	try {
		return stripAnsi(value.toString());
	} catch (e) {
		return '';
	}
}

function isInstructionRemovable(instr) {
	return !!instr && instr.valid !== false && !instr.jump && !instr.cond && !instr.customflow;
}

function escapeRegExp(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceIdentifier(input, identifier, replacement) {
	const re = new RegExp(`\\b${escapeRegExp(identifier)}\\b`, 'g');
	return input.replace(re, replacement);
}

function replaceIdentifierReadsOnly(statementPlain, identifier, replacement) {
	const w = parseWriteStatement(statementPlain);
	if (w && w.varName === identifier) {
		// Only support `x = rhs` here; caller should have filtered out compound/incdec.
		const m = statementPlain.match(/^\s*([A-Za-z_]\w*)(\s*=\s*)(.+?)\s*$/);
		if (!m) return statementPlain;
		const rhsReplaced = replaceIdentifier(m[3], identifier, replacement);
		return `${m[1]}${m[2]}${rhsReplaced}`;
	}
	return replaceIdentifier(statementPlain, identifier, replacement);
}

function parenthesizeIfNeeded(expr) {
	const e = (expr || '').trim();
	if (!e) return e;
	return e.indexOf(' ') > -1 ? `(${e})` : e;
}

function isInvalidDereferenceStatement(plain) {
	// Pattern: *(envp...) = ... or *(argp...) = ...
	const m = plain.match(/^\s*\*\s*\(\s*([A-Za-z_]\w*)/);
	if (!m) return false;
	const name = m[1];
	return name.startsWith('envp') || name.startsWith('argp') || /^arg\d+$/.test(name);
}

function hasSideEffectsExpression(expr) {
	// Conservative: treat any direct call as side-effecting.
	// r2dec prints calls as: "name (args...)" (note the space).
	if (/\b[A-Za-z_]\w*\s+\(/.test(expr)) return true;
	if (/\+\+|--/.test(expr)) return true;
	return false;
}

function parseWriteStatement(plain) {
	// ++x / --x
	let m = plain.match(/^\s*(\+\+|--)\s*([A-Za-z_]\w*)\s*$/);
	if (m) {
		return { varName: m[2], kind: 'incdec' };
	}
	// x++ / x--
	m = plain.match(/^\s*([A-Za-z_]\w*)\s*(\+\+|--)\s*$/);
	if (m) {
		return { varName: m[1], kind: 'incdec' };
	}
	// x = y
	m = plain.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.+?)\s*$/);
	if (m) {
		return { varName: m[1], kind: 'assign', rhs: m[2] };
	}
	// x op= y
	m = plain.match(/^\s*([A-Za-z_]\w*)\s*([^\s=]{1,2})=\s*(.+?)\s*$/);
	if (!m) return null;
	const op = m[2];
	if (!['+', '-', '*', '/', '%', '&', '|', '^', '<<', '>>'].includes(op)) {
		return null;
	}
	return { varName: m[1], kind: 'compound', rhs: m[3] };
}

function parseSimpleAssignment(plain) {
	const w = parseWriteStatement(plain);
	if (!w || w.kind !== 'assign') return null;
	return { varName: w.varName, expression: (w.rhs || '').trim() };
}

function identifierReadCountInPlainStatement(plain, identifier) {
	const w = parseWriteStatement(plain);
	const idre = new RegExp(`\\b${escapeRegExp(identifier)}\\b`, 'g');

	if (w && w.varName === identifier) {
		if (w.kind === 'incdec') {
			return 1;
		}
		if (w.kind === 'compound') {
			// x += y reads x then writes it.
			const rhs = w.rhs || '';
			return 1 + ((rhs.match(idre) || []).length);
		}
		// x = rhs reads only rhs.
		const rhs = w.rhs || '';
		return (rhs.match(idre) || []).length;
	}

	return (plain.match(idre) || []).length;
}

function getConditionReads(instr) {
	if (!instr || !instr.cond) return '';
	const a = asPlainString(instr.cond.a);
	const b = asPlainString(instr.cond.b);
	return `${a} ${b}`.trim();
}

function simplifyTrivialConstants(plain) {
	if (!plain) return plain;
	let out = plain;
	let changed = true;
	while (changed) {
		changed = false;
		const before = out;

		// Remove unnecessary parens around trivial constants.
		out = out.replace(/\(\s*0\s*\)/g, '0');
		out = out.replace(/\(\s*1\s*\)/g, '1');

		// Fold comparisons between constants only.
		out = out.replace(/\b0\s*==\s*0\b/g, '1');
		out = out.replace(/\b1\s*==\s*1\b/g, '1');
		out = out.replace(/\b0\s*!=\s*0\b/g, '0');
		out = out.replace(/\b1\s*!=\s*1\b/g, '0');
		out = out.replace(/\b0\s*==\s*1\b/g, '0');
		out = out.replace(/\b1\s*==\s*0\b/g, '0');
		out = out.replace(/\b0\s*!=\s*1\b/g, '1');
		out = out.replace(/\b1\s*!=\s*0\b/g, '1');

		if (out !== before) changed = true;
	}
	return out;
}

function isSimplePropagatableRhs(rhs) {
	// Keep this intentionally conservative: it must help readability and not explode.
	const s = (rhs || '').trim();
	if (!s) return false;
	if (hasSideEffectsExpression(s)) return false;
	if (s.includes('*')) return false; // avoid inlining memory dereferences by default
	if (s.includes('?') || s.includes(':')) return false; // ternary can get noisy quickly
	if (s.length > 64) return false;
	// Allow numbers, identifiers, and simple arithmetic/pointer expressions.
	if (/^0x[0-9a-fA-F]+$/.test(s)) return true;
	if (/^\d+$/.test(s)) return true;
	if (/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(s)) return true; // vars or reloc.sym
	if (/^[A-Za-z_]\w*(?:\s*(?:\\+|-|<<|>>)\s*[A-Za-z_0-9x][A-Za-z_0-9x]*)+$/.test(s)) return true;
	return false;
}

function isSimpleIdentifierLike(expr) {
	const s = (expr || '').trim();
	if (!s) return false;
	if (/^0x[0-9a-fA-F]+$/.test(s) || /^\d+$/.test(s)) return true;
	return /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(s);
}

function applySubstitutionsToStatement(statementPlain, env) {
	let out = statementPlain;
	for (var name in env) {
		if (!Object.prototype.hasOwnProperty.call(env, name)) continue;
		out = replaceIdentifierReadsOnly(out, name, parenthesizeIfNeeded(env[name]));
	}
	return out;
}

function applySubstitutionsToConditionOperand(operand, env) {
	let out = simplifyTrivialConstants(asPlainString(operand));
	for (var name in env) {
		if (!Object.prototype.hasOwnProperty.call(env, name)) continue;
		out = replaceIdentifier(out, name, parenthesizeIfNeeded(env[name]));
	}
	return out;
}

function clearEnv(env) {
	for (var k in env) {
		if (Object.prototype.hasOwnProperty.call(env, k)) {
			delete env[k];
		}
	}
}

function propagateConstants(instructions, seedEnv) {
	let changed = false;
	const events = collectEvents(instructions);

	// Do not propagate across branch points (conditional jumps).
	let env = Object.create(null);
	if (seedEnv) {
		for (var k in seedEnv) {
			if (Object.prototype.hasOwnProperty.call(seedEnv, k)) {
				env[k] = seedEnv[k];
			}
		}
	}

	const resetEnvIfNeeded = (instr) => {
		if (!instr) return;
		if (instr.cond) {
			// Being conservative: do not carry facts across branch points.
			clearEnv(env);
			if (seedEnv) {
				for (var k in seedEnv) {
					if (Object.prototype.hasOwnProperty.call(seedEnv, k)) {
						env[k] = seedEnv[k];
					}
				}
			}
		}
	};

	for (let i = 0; i < events.length; i++) {
		const ev = events[i];
		resetEnvIfNeeded(ev.instr);

		if (ev.type === 'cond') {
			const instr = ev.instr;
			if (!instr.cond) continue;
			const a0 = asPlainString(instr.cond.a);
			const b0 = asPlainString(instr.cond.b);
			const a1 = applySubstitutionsToConditionOperand(a0, env);
			const b1 = applySubstitutionsToConditionOperand(b0, env);
			if (a1 !== a0) {
				instr.cond.a = a1;
				changed = true;
			}
			if (b1 !== b0) {
				instr.cond.b = b1;
				changed = true;
			}
			continue;
		}

		if (ev.type !== 'stmt') continue;
		const plain0 = ev.getPlain();
		if (!plain0) continue;

		const simplified0 = simplifyTrivialConstants(plain0);
		let plain1 = applySubstitutionsToStatement(simplified0, env);
		plain1 = simplifyTrivialConstants(plain1);

		if (plain1 !== plain0) {
			ev.setPlain(plain1);
			changed = true;
		}

		// Update environment after applying substitutions.
		const w = parseWriteStatement(plain1);
		if (w) {
			// Any write kills previous knowledge.
			delete env[w.varName];
			// Avoid propagating frame-pointer style registers; it tends to make output worse
			// (turns stack slots into raw `sp + ...` arithmetic and breaks readability).
			if (isBasePointerRegister(w.varName)) {
				continue;
			}
			if (w.kind === 'assign' && isSimplePropagatableRhs(w.rhs)) {
				env[w.varName] = w.rhs.trim();
			}
			continue;
		}

		// Non-assignment statement: if it reads a variable we track, keep it;
		// if it contains an unknown write, we already ignored it (safe).
	}

	return changed;
}

function isStackChkFailStatement(plain) {
	return /\bstack_chk_fail\s*\(/.test(plain) || /\b__stack_chk_fail\s*\(/.test(plain);
}

function matchStackSaveSlot(plain) {
	// Common patterns:
	//   *((x29 - 8)) = x8;
	//   *(((sp + 0x40) - 8)) = x8;
	const m = plain.match(/^\s*(\*\s*\(\s*\(\s*.+?\s*-\s*8\s*\)\s*\))\s*=\s*(.+?)\s*$/);
	if (!m) return null;
	return { slot: m[1].replace(/\s+/g, ''), rhs: m[2].trim() };
}

function buildGuardValueExprFromWindow(window) {
	// Heuristic:
	//   x8 = reloc.__stack_chk_fail;
	//   x8 = *((x8 + 8));   OR x8 = *((reloc.__stack_chk_fail + 8));
	//   x8 = *(x8);
	// => guard value is *(*((reloc.__stack_chk_fail + 8))) or *(x8) if already folded.
	const seq = window.slice().reverse().map(x => (x || '').trim()).filter(Boolean);

	// Try the common folded form:
	//   x8 = *((reloc.__stack_chk_fail + 8));
	//   x8 = *(x8);   (sometimes present, but not required for reconstruction)
	for (let i = 0; i < seq.length; i++) {
		const s0 = seq[i];
		const m = s0.match(/^\s*x8\s*=\s*(\*\s*\(\s*\(\s*reloc\.[A-Za-z_]\w*\s*\+\s*8\s*\)\s*\))\s*$/);
		if (m) {
			const ptrDeref = m[1].replace(/\s+/g, ' ');
			return `*(${ptrDeref})`;
		}
	}

	let base = null;
	for (let i = seq.length - 1; i >= 0; i--) {
		const s = seq[i];
		const m = s.match(/^\s*x8\s*=\s*(reloc\.[A-Za-z_]\w*)\s*$/);
		if (m) {
			base = m[1];
			break;
		}
	}
	if (!base) return null;

	let ptrDeref = null;
	for (let i = seq.length - 1; i >= 0; i--) {
		const s = seq[i];
		let m = s.match(/^\s*x8\s*=\s*\*\s*\(\s*\(\s*x8\s*\+\s*8\s*\)\s*\)\s*$/);
		if (m) {
			ptrDeref = `*((${base} + 8))`;
			break;
		}
		m = s.match(/^\s*x8\s*=\s*\*\s*\(\s*\(\s*reloc\.[A-Za-z_]\w*\s*\+\s*8\s*\)\s*\)\s*$/);
		if (m) {
			// Accept other reloc names too.
			ptrDeref = s.replace(/^\s*x8\s*=\s*/, '').trim();
			break;
		}
	}
	if (!ptrDeref) return null;
	return `*(${ptrDeref})`;
}

function simplifyStackCanaryChecks(instructions) {
	let changed = false;
	if (!instructions || instructions.length < 1) return false;

	// Find "if (...) { stack_chk_fail(); }" blocks and rewrite their condition.
	for (let idx = 0; idx < instructions.length; idx++) {
		const instr = instructions[idx];
		if (!instr || instr.valid === false) continue;
		if (!instr.cond || !instr.code || !instr.code.composed || !Array.isArray(instr.code.composed)) continue;

		const body = instr.code.composed.map(x => asPlainString(x).trim()).filter(Boolean);
		if (body.length < 1) continue;
		if (!body.every(isStackChkFailStatement)) continue;

		// Only rewrite the noisy patterns (w8, & 0, == 0, etc.)
		const condText = (asPlainString(instr.cond.a) + ' ' + asPlainString(instr.cond.b)).trim();
		if (!/\bw8\b/.test(condText) && !/&\s*0/.test(condText) && !/\b==\s*0\b/.test(condText)) {
			continue;
		}

		// Look backwards for the stack canary save slot.
		let savedSlot = '*((x29-8))';
		for (let j = idx - 1; j >= 0 && j >= idx - 25; j--) {
			const prev = instructions[j];
			if (!prev || prev.valid === false || !prev.code) continue;
			const s = asPlainString(prev.code).trim();
			const m = matchStackSaveSlot(s);
			if (m) {
				savedSlot = m.slot;
				break;
			}
		}

		// Build a best-effort guard expression from nearby statements.
		const window = [];
		for (let j = idx - 1; j >= 0 && j >= idx - 18; j--) {
			const prev = instructions[j];
			if (!prev || prev.valid === false || !prev.code) continue;
			window.push(asPlainString(prev.code));
		}
		const guardExpr = buildGuardValueExprFromWindow(window);
		if (!guardExpr) continue;

		// Make the condition print as: if (guard != saved) { stack_chk_fail(); }
		// ControlFlow typically prints `invert=true`, so using `EQ` yields `!=` in that common case.
		instr.cond.a = guardExpr;
		instr.cond.b = savedSlot;
		instr.cond.type = 'EQ';
		changed = true;

		// Remove immediate-prelude temporary statements for the check (best-effort).
		for (let j = idx - 1; j >= 0 && j >= idx - 10; j--) {
			const prev = instructions[j];
			if (!prev || prev.valid === false || !prev.code || !isInstructionRemovable(prev)) continue;
			const s = asPlainString(prev.code).trim();
			if (/^\s*w8\s*=/.test(s) ||
				/^\s*x9\s*=/.test(s) ||
				/^\s*x8\s*=/.test(s) ||
				/^\s*x8\s*-=/.test(s)) {
				prev.valid = false;
				prev.code = null;
				changed = true;
			}
		}
	}

	return changed;
}

function findInstructionIndexAtOrAfterAddress(instructions, address) {
	if (!instructions || !address) return -1;
	for (let i = 0; i < instructions.length; i++) {
		if (instructions[i] && instructions[i].location && instructions[i].location.gte(address)) {
			return i;
		}
	}
	return -1;
}

function simplifyStackCanaryScopes(session) {
	if (!session || !session.blocks || !session.instructions) return false;
	let changed = false;

	for (let b = 0; b < session.blocks.length; b++) {
		const block = session.blocks[b];
		if (!block || !block.extraHead || !block.instructions) continue;

		for (let h = 0; h < block.extraHead.length; h++) {
			const head = block.extraHead[h];
			if (!head || !head.condition || !head.address) continue;

			// Only "if" scopes for now.
			const headStr = asPlainString(head.toString ? head.toString() : '').trim();
			if (!headStr.startsWith('if')) continue;

			const condStr = asPlainString(head.condition.toString ? head.condition.toString() : '').trim();
			if (!/\bw8\b/.test(condStr) && !/&\s*0/.test(condStr) && !/\b==\s*0\b/.test(condStr)) {
				continue;
			}
			if (Global().evars && Global().evars.extra && Global().evars.extra.debug) {
				Global().context.printLog('[optimizer] stackchk scope candidate @ 0x' + head.address.toString(16) + ' cond=' + condStr);
			}

			// Find the most recent "saved canary" slot assignment before this scope address.
			let savedSlot = '*((x29-8))';
			let saveInstr = null;
			let saveIndex = -1;
			for (let j = 0; j < session.instructions.length; j++) {
				const prev = session.instructions[j];
				if (!prev || prev.valid === false || !prev.code) continue;
				const s = asPlainString(prev.code).trim();
				const m = matchStackSaveSlot(s);
				if (!m) continue;
				savedSlot = m.slot;
				saveInstr = prev;
				saveIndex = j;
			}

			// Build a best-effort guard expression from the vicinity of the save.
			const window = [];
			if (saveIndex >= 0) {
				const start = Math.max(0, saveIndex - 20);
				const end = Math.min(session.instructions.length - 1, saveIndex + 10);
				for (let j = start; j <= end; j++) {
					const p = session.instructions[j];
					if (!p || p.valid === false || !p.code) continue;
					window.push(asPlainString(p.code));
				}
			}
			const guardExpr = buildGuardValueExprFromWindow(window);
			if (!guardExpr) {
				if (Global().evars && Global().evars.extra && Global().evars.extra.debug) {
					Global().context.printLog('[optimizer] stackchk: failed to build guard expression');
				}
				continue;
			}

			// If we found the save instruction, make it store the guard expression directly.
			// This enables removing intermediate x8 assignments without leaving `savedSlot = x8` dangling.
			if (saveInstr && saveInstr.code) {
				const savePlain = asPlainString(saveInstr.code).trim();
				const m = matchStackSaveSlot(savePlain);
				if (m && m.rhs === 'x8') {
					saveInstr.code = Base.special(`${savedSlot} = ${guardExpr}`);
					saveInstr.valid = true;
					changed = true;
				}
			}

			// Rewrite: if (guard != saved) stack_chk_fail();
			head.condition.a = guardExpr;
			head.condition.b = savedSlot;
			head.condition.condition = 'EQ';
			changed = true;
			if (Global().evars && Global().evars.extra && Global().evars.extra.debug) {
				Global().context.printLog('[optimizer] stackchk rewrite: a=' + guardExpr + ' b=' + savedSlot);
			}

			// Remove the immediate-prelude "w8/x8/x9" computations (same heuristic as instruction pass).
			const idx = findInstructionIndexAtOrAfterAddress(session.instructions, head.address);
			for (let j = idx - 1; j >= 0 && j >= idx - 60; j--) {
				const prev = session.instructions[j];
				if (!prev || prev.valid === false || !prev.code || !isInstructionRemovable(prev)) continue;
				if (saveInstr && prev.location && prev.location.lt(saveInstr.location)) continue;
				const s = asPlainString(prev.code).trim();
				if (/^\s*w8\s*=/.test(s) ||
					/^\s*x9\s*=/.test(s) ||
					/^\s*x8\s*=/.test(s) ||
					/^\s*x8\s*-=/.test(s)) {
					prev.valid = false;
					prev.code = null;
					changed = true;
				}
			}
		}
	}

	return changed;
}

function compactInstructionCode(instr) {
	if (!instr || !instr.code || !instr.code.composed || !Array.isArray(instr.code.composed)) {
		return;
	}
	instr.code.composed = instr.code.composed.filter(x => x !== null && x !== undefined && (typeof x !== 'string' || x.trim().length > 0));
	if (instr.code.composed.length === 0) {
		instr.code = null;
		if (isInstructionRemovable(instr)) {
			instr.valid = false;
		}
	}
}

function collectEvents(instructions) {
	const events = [];
	for (const instr of instructions || []) {
		if (!instr || instr.valid === false) continue;
		if (instr.cond) {
			events.push({ type: 'cond', instr });
		}
		if (!instr.code) continue;
		if (instr.code.composed && Array.isArray(instr.code.composed)) {
			for (let i = 0; i < instr.code.composed.length; i++) {
				const refIndex = i;
				events.push({
					type: 'stmt',
					instr,
					getPlain: () => asPlainString(instr.code.composed[refIndex]),
					setPlain: (s) => { instr.code.composed[refIndex] = Base.special(s); },
					remove: () => { instr.code.composed[refIndex] = null; },
				});
			}
		} else {
			events.push({
				type: 'stmt',
				instr,
				getPlain: () => asPlainString(instr.code),
				setPlain: (s) => { instr.code = Base.special(s); instr.valid = true; },
				remove: () => {
					if (isInstructionRemovable(instr)) {
						instr.valid = false;
						instr.code = null;
					} else {
						// Keep the instruction (it may be part of control-flow), but drop the statement.
						instr.code = null;
					}
				},
			});
		}
	}
	return events;
}

function removeInvalidDereferences(instructions) {
	let changed = false;
	const events = collectEvents(instructions);
	for (const ev of events) {
		if (ev.type !== 'stmt') continue;
		const plain = ev.getPlain();
		if (!plain) continue;
		if (isInvalidDereferenceStatement(plain)) {
			ev.remove();
			changed = true;
		}
	}
	for (const instr of instructions || []) {
		compactInstructionCode(instr);
	}
	return changed;
}

function simplifyStatementsAndConditions(instructions) {
	let changed = false;
	const events = collectEvents(instructions);
	for (const ev of events) {
		if (ev.type === 'cond') {
			const instr = ev.instr;
			const a0 = asPlainString(instr.cond.a);
			const b0 = asPlainString(instr.cond.b);
			const a1 = simplifyTrivialConstants(a0);
			const b1 = simplifyTrivialConstants(b0);
			if (a1 !== a0) {
				instr.cond.a = a1;
				changed = true;
			}
			if (b1 !== b0) {
				instr.cond.b = b1;
				changed = true;
			}
			continue;
		}
		if (ev.type === 'stmt') {
			const plain0 = ev.getPlain();
			if (!plain0) continue;
			const plain1 = simplifyTrivialConstants(plain0);
			if (plain1 !== plain0) {
				ev.setPlain(plain1);
				changed = true;
			}
		}
	}
	return changed;
}

function inlineSingleUseAssignments(instructions) {
	let changed = false;
	const events = collectEvents(instructions);

	for (let i = 0; i < events.length; i++) {
		const ev = events[i];
		if (ev.type !== 'stmt') continue;

		const plain = ev.getPlain();
		if (!plain) continue;

		const a = parseSimpleAssignment(plain);
		if (!a) continue;

		// Avoid inlining frame-pointer style registers; it turns stack vars into raw SP arithmetic.
		if (isBasePointerRegister(a.varName)) {
			continue;
		}

		const rhs = a.expression;
		if (!rhs) continue;
		if (rhs.length > 80) continue;
		if (hasSideEffectsExpression(rhs)) continue;
		if (new RegExp(`\\b${escapeRegExp(a.varName)}\\b`).test(rhs)) continue;

		let reads = 0;
		let readEventIndex = -1;
		let readInConditionOnly = false;

		for (let j = i + 1; j < events.length; j++) {
			const next = events[j];
			if (next.type === 'stmt') {
				const nextPlain = next.getPlain();
				if (!nextPlain) continue;
				const w = parseWriteStatement(nextPlain);
				if (w && w.varName === a.varName) {
					// The boundary write may still read the previous value (e.g. `x = f(x)`).
					const boundaryReads = identifierReadCountInPlainStatement(nextPlain, a.varName);
					if (boundaryReads > 0 && readEventIndex === -1) {
						readEventIndex = j;
					}
					reads += boundaryReads;
					break;
				}
				const c = identifierReadCountInPlainStatement(nextPlain, a.varName);
				if (c > 0) {
					reads += c;
					readEventIndex = readEventIndex === -1 ? j : readEventIndex;
				}
			} else if (next.type === 'cond') {
				const condPlain = getConditionReads(next.instr);
				const c = identifierReadCountInPlainStatement(condPlain, a.varName);
				if (c > 0) {
					reads += c;
					readInConditionOnly = true;
				}
			}

			if (reads > 1) break;
		}

		if (reads !== 1 || readEventIndex === -1 || readInConditionOnly) {
			continue;
		}

		const target = events[readEventIndex];
		if (target.type !== 'stmt') continue;

		const targetPlain = target.getPlain();
		// Don’t inline into self-overwrites (`x = f(x)` / `x += ...` / `x++`):
		// it tends to create unreadable deref chains and can explode expression size.
		const wTarget = parseWriteStatement(targetPlain);
		if (wTarget && wTarget.varName === a.varName) {
			// Exception: allow rewriting the RHS of a self-overwrite when the source is a simple identifier/constant.
			// This is useful for argument moves like `x1 = argv; x1 = *((x1 + 8));`.
			if (!(wTarget.kind === 'assign' && isSimpleIdentifierLike(rhs))) {
				continue;
			}
		}
		const wrapped = parenthesizeIfNeeded(rhs);
		const replaced = replaceIdentifierReadsOnly(targetPlain, a.varName, wrapped);
		if (replaced === targetPlain) continue;
		if (replaced.length > 200 || replaced.length > (targetPlain.length + 60)) continue;

		target.setPlain(replaced);
		ev.remove();
		changed = true;
	}

	for (const instr of instructions || []) {
		compactInstructionCode(instr);
	}
	return changed;
}

function isReturnRegisterName(name) {
	// Heuristic list (covers the most common architectures in r2dec output).
	return ['w0', 'x0', 'r0', 'eax', 'rax', 'v0'].includes(name);
}

function hasSubsequentReturn(events, startIndex) {
	for (let i = startIndex + 1; i < events.length; i++) {
		const ev = events[i];
		if (ev.type !== 'stmt') continue;
		const s = (ev.getPlain() || '').trim();
		if (s === 'return' || s.startsWith('return ')) {
			return true;
		}
	}
	return false;
}

function hasSubsequentBareReturn(events, startIndex) {
	for (let i = startIndex + 1; i < events.length; i++) {
		const ev = events[i];
		if (ev.type !== 'stmt') continue;
		const s = (ev.getPlain() || '').trim();
		if (s === 'return') {
			return true;
		}
	}
	return false;
}

function fixReturnStatements(instructions) {
	let changed = false;
	const events = collectEvents(instructions);

	for (let i = 0; i < events.length; i++) {
		const ev = events[i];
		if (ev.type !== 'stmt') continue;

		const retPlain = (ev.getPlain() || '').trim();
		if (retPlain !== 'return') continue;

		// Search backwards for the nearest return-register assignment.
		for (let j = i - 1; j >= 0; j--) {
			const prev = events[j];
			if (prev.type !== 'stmt') continue;
			if (prev.instr && (prev.instr.jump || prev.instr.cond)) break;
			if (ev.instr && (ev.instr.jump || ev.instr.cond)) break;

			const prevPlain = (prev.getPlain() || '').trim();
			const a = parseSimpleAssignment(prevPlain);
			if (!a) continue;
			if (!isReturnRegisterName(a.varName)) continue;
			if (!a.expression) continue;

			// Ensure the assigned value is not used between assignment and return.
			let used = false;
			for (let k = j + 1; k < i; k++) {
				const mid = events[k];
				if (mid.type === 'cond') {
					const condPlain = getConditionReads(mid.instr);
					if (identifierReadCountInPlainStatement(condPlain, a.varName) > 0) {
						used = true;
						break;
					}
					continue;
				}
				if (mid.type !== 'stmt') continue;
				const midPlain = mid.getPlain();
				if (!midPlain) continue;
				if (identifierReadCountInPlainStatement(midPlain, a.varName) > 0) {
					used = true;
					break;
				}
				const w = parseWriteStatement(midPlain);
				if (w && w.varName === a.varName) {
					// Overwritten before return.
					used = true;
					break;
				}
			}
			if (used) break;

			// Convert `return;` + `w0 = X;` into `return X;`.
			ev.setPlain(`return ${a.expression}`);
			prev.remove();
			changed = true;
			break;
		}
	}

	for (const instr of instructions || []) {
		compactInstructionCode(instr);
	}
	return changed;
}

function removeDeadAssignments(instructions) {
	let changed = false;
	const events = collectEvents(instructions);

	for (let i = 0; i < events.length; i++) {
		const ev = events[i];
		if (ev.type !== 'stmt') continue;

		const plain = ev.getPlain();
		if (!plain) continue;

		const a = parseSimpleAssignment(plain);
		if (!a) continue;
		if (!a.expression) continue;
		if (hasSideEffectsExpression(a.expression)) continue;

		// Keep final return-register writes: r2dec may print `return;` even for non-void.
		// If we already have `return <expr>`, these become dead and should be removable.
		if (isReturnRegisterName(a.varName) && hasSubsequentBareReturn(events, i)) {
			continue;
		}

		let used = false;

		for (let j = i + 1; j < events.length; j++) {
			const next = events[j];
			if (next.type === 'stmt') {
				const nextPlain = next.getPlain();
				if (!nextPlain) continue;
				const w = parseWriteStatement(nextPlain);
				if (w && w.varName === a.varName) {
					// Boundary write may still read previous value (`x = f(x)`) or be compound/inc.
					if (identifierReadCountInPlainStatement(nextPlain, a.varName) > 0) {
						used = true;
					}
					break;
				}
				if (identifierReadCountInPlainStatement(nextPlain, a.varName) > 0) {
					used = true;
					break;
				}
			} else if (next.type === 'cond') {
				const condPlain = getConditionReads(next.instr);
				if (identifierReadCountInPlainStatement(condPlain, a.varName) > 0) {
					used = true;
					break;
				}
			}
		}

		if (!used) {
			ev.remove();
			changed = true;
		}
	}

	for (const instr of instructions || []) {
		compactInstructionCode(instr);
	}
	return changed;
}

function parseArgNamesFromRoutine(routine) {
	if (!routine || !routine.extra || !Array.isArray(routine.extra.args)) return [];
	const names = [];
	for (let i = 0; i < routine.extra.args.length; i++) {
		const s = asPlainString(routine.extra.args[i]).trim();
		if (!s) continue;
		const parts = s.split(/\s+/);
		const name = parts[parts.length - 1];
		if (name) names.push(name);
	}
	return names;
}

function parseArgTypesFromRoutine(routine) {
	// Very lightweight parsing just to detect pointer depth for argv-like args.
	// Examples:
	//   "char ** argv" -> { argv: { pointerDepth: 2 } }
	//   "int32_t argc" -> { argc: { pointerDepth: 0 } }
	if (!routine || !routine.extra || !Array.isArray(routine.extra.args)) return Object.create(null);
	const info = Object.create(null);
	for (let i = 0; i < routine.extra.args.length; i++) {
		const s = asPlainString(routine.extra.args[i]).trim().replace(/\s+/g, ' ');
		if (!s) continue;
		const parts = s.split(' ');
		if (parts.length < 2) continue;
		const name = parts[parts.length - 1];
		const type = parts.slice(0, -1).join(' ');
		const pointerDepth = (type.match(/\*/g) || []).length;
		info[name] = { pointerDepth };
	}
	return info;
}

function ptrSizeBytes() {
	const bits = (Global().evars && Global().evars.archbits) ? Global().evars.archbits : 0;
	return bits >= 64 ? 8 : (bits >= 32 ? 4 : 0);
}

function simplifyPointerIndexingExpr(text, strideMap) {
	let out = text;
	if (!strideMap) return out;

	for (var name in strideMap) {
		if (!Object.prototype.hasOwnProperty.call(strideMap, name)) continue;
		const stride = strideMap[name] >>> 0;
		if (!stride) continue;

		// Match: * ( ( name + imm ) )   (with any whitespace, imm is dec or hex)
		// Also handles extra parentheses like (*((name + imm))).
		const re = new RegExp(`\\*\\s*\\(\\s*\\(\\s*${escapeRegExp(name)}\\s*\\+\\s*(0x[0-9a-fA-F]+|\\d+)\\s*\\)\\s*\\)`, 'g');
		out = out.replace(re, (m, immStr) => {
			const imm = immStr.startsWith('0x') ? parseInt(immStr, 16) : parseInt(immStr, 10);
			if (!Number.isFinite(imm) || imm < 0) return m;
			if (imm % stride !== 0) return m;
			const idx = (imm / stride) | 0;
			return `${name}[${idx}]`;
		});

		// Clean redundant parentheses: (argv[1]) -> argv[1]
		out = out.replace(new RegExp(`\\(\\s*${escapeRegExp(name)}\\[(\\d+)\\]\\s*\\)`, 'g'), `${name}[$1]`);
	}

	return out;
}

function simplifyPointerIndexing(session) {
	if (!session || !session.routine || !session.instructions) return false;
	const types = parseArgTypesFromRoutine(session.routine);
	const psz = ptrSizeBytes();
	if (!psz) return false;

	const strideMap = Object.create(null);
	for (var name in types) {
		if (!Object.prototype.hasOwnProperty.call(types, name)) continue;
		// `char **argv` => argv[1] from *(argv + 8)
		if ((types[name].pointerDepth || 0) >= 2) {
			strideMap[name] = psz;
		}
	}
	if (Object.keys(strideMap).length === 0) return false;

	let changed = false;
	const events = collectEvents(session.instructions);
	for (let i = 0; i < events.length; i++) {
		const ev = events[i];
		if (ev.type === 'stmt') {
			const s0 = ev.getPlain();
			if (!s0) continue;
			const s1 = simplifyPointerIndexingExpr(s0, strideMap);
			if (s1 !== s0) {
				ev.setPlain(s1);
				changed = true;
			}
		} else if (ev.type === 'cond') {
			const instr = ev.instr;
			const a0 = asPlainString(instr.cond.a);
			const b0 = asPlainString(instr.cond.b);
			const a1 = simplifyPointerIndexingExpr(a0, strideMap);
			const b1 = simplifyPointerIndexingExpr(b0, strideMap);
			if (a1 !== a0) {
				instr.cond.a = a1;
				changed = true;
			}
			if (b1 !== b0) {
				instr.cond.b = b1;
				changed = true;
			}
		}
	}
	return changed;
}

function isRegisterIdentifier(name) {
	return /^[xw]\d+$/.test(name) || /^r\d+$/.test(name) || /^(e|r)?ax$/.test(name);
}

function getArgumentAliasSeed(session) {
	if (!session || !session.routine || !session.routine.extra || !Array.isArray(session.routine.extra.locals)) {
		return null;
	}
	const argNamesArr = parseArgNamesFromRoutine(session.routine);
	if (argNamesArr.length === 0) return null;
	const argNames = Object.create(null);
	for (let i = 0; i < argNamesArr.length; i++) {
		argNames[argNamesArr[i]] = true;
	}

	// Extract alias-like locals: `x1 = argv`
	const seedEnv = Object.create(null);
	const aliasLines = Object.create(null); // reg -> original line

	for (let i = 0; i < session.routine.extra.locals.length; i++) {
		const raw = session.routine.extra.locals[i];
		const line = asPlainString(raw).trim();
		const m = line.match(/^([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*$/);
		if (!m) continue;
		const lhs = m[1];
		const rhs = m[2];
		if (!isRegisterIdentifier(lhs) || !argNames[rhs]) continue;
		seedEnv[lhs] = rhs;
		aliasLines[lhs] = raw;
	}

	if (Object.keys(seedEnv).length === 0) return null;
	return { seedEnv, aliasLines };
}

function pruneArgumentAliasLocals(session, aliasLines) {
	if (!session || !session.routine || !session.routine.extra || !Array.isArray(session.routine.extra.locals) || !aliasLines) {
		return false;
	}
	const usage = Object.create(null);
	for (var reg in aliasLines) {
		if (Object.prototype.hasOwnProperty.call(aliasLines, reg)) {
			usage[reg] = 0;
		}
	}

	const events = collectEvents(session.instructions || session);
	for (let i = 0; i < events.length; i++) {
		const ev = events[i];
		if (ev.type === 'stmt') {
			const s = ev.getPlain();
			if (!s) continue;
			for (var reg in usage) {
				if (!Object.prototype.hasOwnProperty.call(usage, reg)) continue;
				usage[reg] += identifierReadCountInPlainStatement(s, reg);
			}
		} else if (ev.type === 'cond') {
			const s = getConditionReads(ev.instr);
			for (var reg in usage) {
				if (!Object.prototype.hasOwnProperty.call(usage, reg)) continue;
				usage[reg] += identifierReadCountInPlainStatement(s, reg);
			}
		}
	}

	let changed = false;
	const out = [];
	for (let i = 0; i < session.routine.extra.locals.length; i++) {
		const raw = session.routine.extra.locals[i];
		const line = asPlainString(raw).trim();
		const m = line.match(/^([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*$/);
		if (m) {
			const lhs = m[1];
			if (aliasLines[lhs] === raw && usage[lhs] === 0) {
				changed = true;
				continue;
			}
		}
		out.push(raw);
	}
	session.routine.extra.locals = out;
	return changed;
}

export default function optimize(instructions) {
	const session = Array.isArray(instructions) ? null : instructions;
	const instrs = Array.isArray(instructions) ? instructions : (instructions ? instructions.instructions : null);

	if (!instrs || instrs.length === 0) {
		return;
	}

	const argAlias = (session && session.routine) ? getArgumentAliasSeed(session) : null;

	// Fixed-point iteration: stop when nothing changes.
	for (let pass = 0; pass < 6; pass++) {
		let changed = false;
		changed = removeInvalidDereferences(instrs) || changed;
		changed = propagateConstants(instrs, argAlias ? argAlias.seedEnv : null) || changed;
		changed = simplifyStatementsAndConditions(instrs) || changed;
		changed = inlineSingleUseAssignments(instrs) || changed;
		changed = simplifyStackCanaryChecks(instrs) || changed;
		changed = fixReturnStatements(instrs) || changed;
		changed = removeDeadAssignments(instrs) || changed;
		if (session) {
			changed = simplifyStackCanaryScopes(session) || changed;
			changed = simplifyPointerIndexing(session) || changed;
		}
		if (session && session.routine && argAlias) {
			changed = pruneArgumentAliasLocals(session, argAlias.aliasLines) || changed;
		}
		if (!changed) break;
	}
}
