/* 
 * Copyright (c) 2017, pancake <pancake@nopcode.org>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

var r2dec = require('./r2dec.js');
var r2pipe = require('r2pipe');
var util = require('util');

r2pipe.open(async (err, r2) => {
  main(err, r2).then(console.log).catch(console.error);
});

async function main(err, r2) {
  const cmd = util.promisify(r2.cmd).bind(r2);
  const cmdj = util.promisify(r2.cmdj).bind(r2);
  if (err) {
    throw err;
  }

  // const arch = await r2.cmd('e asm.arch');
  const arch = 'ppc';

  // analyze entrypoint function
  await cmd('af');
  const pdfj = await cmdj('pdfj');
  var decompiler = new r2dec(arch);
  var buffer = '';
  decompiler.work(pdfj).print(m => {
    if (m) buffer += m;
  });
  console.log(buffer);
  await r2.quit();
  return true;
}
