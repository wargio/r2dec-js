// SPDX-FileCopyrightText: 2017-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import core from './core.js';
import archs from './archs.js';
import context from './context.js';

export default {
	core: core,
	archs: archs,
	context: context,
	supported: function() {
		return 'Supported architectures:\n    ' + Object.keys(this.archs).join(', ');
	}
};
