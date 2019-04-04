/* 
 * Copyright (C) 2018 deroad
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

module.exports = (function() {
    /**
     * On r2 this can be done via afcfj <function name>
     * [
     *    {
     *      "name": "localtime",
     *      "return": "struct tm *",
     *      "count": 1,
     *      "args": [
     *        {
     *          "name": "timer",
     *          "type": "const time_t *"
     *        }
     *      ]
     *    }
     *  ]
     */
    return {
        'exit': {
            macro: ['#include <stdlib.h>'],
            args: 1
        },
        'fgets': {
            macro: ['#include <stdio.h>'],
            args: 3
        },
        'fwrite': {
            macro: ['#include <stdio.h>'],
            args: 4
        },
        'fread': {
            macro: ['#include <stdio.h>'],
            args: 4
        },
        'textdomain': {
            macro: ['#include <libintl.h>'],
            args: -1
        },
        'setlocale': {
            macro: ['#include <locale.h>'],
            args: -1
        },
        'wcscmp': {
            macro: ['#include <wchar.h>'],
            args: 2
        },
        'strcmp': {
            macro: ['#include <string.h>'],
            args: 2
        },
        'strncmp': {
            macro: ['#include <string.h>'],
            args: 3
        },
        'msvcrt_dll_memset': {
            macro: ['#include <string.h>'],
            args: 3
        },
        'xmalloc': {
            macro: ['#include <stdlib.h>'],
            args: 1
        },
        'memset': {
            macro: ['#include <string.h>'],
            args: 3
        },
        'memcpy': {
            macro: ['#include <string.h>'],
            args: 3
        },
        'strcpy': {
            macro: ['#include <string.h>'],
            args: 2
        },
        'puts': {
            macro: ['#include <stdio.h>'],
            args: 1
        },
        'printf': {
            macro: ['#include <stdio.h>'],
            args: -1
        },
        'scanf': {
            macro: ['#include <stdio.h>'],
            args: -1
        },
        'isoc99_scanf': {
            macro: ['#include <stdio.h>'],
            args: -1
        },
        'getenv': {
            macro: ['#include <stdlib.h>'],
            args: 1
        },
        'time': {
            macro: ['#include <time.h>'],
            args: 1
        },
        'localtime': {
            macro: ['#include <time.h>'],
            args: 1
        },
        'dcgettext': {
            macro: ['#include <libintl.h>'],
            args: 2
        },
        'pthread_create': {
            macro: ['#include <pthread.h>'],
            args: 4,
        },
        'pthread_join': {
            macro: ['#include <pthread.h>'],
            args: 2,
        },
        'pthread_exit': {
            macro: ['#include <pthread.h>'],
            args: 1,
        },
        'pthread_cancel': {
            macro: ['#include <pthread.h>'],
            args: 1,
        },
        'pthread_attr_init': {
            macro: ['#include <pthread.h>'],
            args: 1,
        },
        'pthread_attr_destroy': {
            macro: ['#include <pthread.h>'],
            args: 1,
        },
        'socket': {
            macro: ['#include <pthread.h>'],
            args: 3,
        },
        'accept': {
            macro: ['#include <sys/socket.h>'],
            args: 3,
        },
        'bind': {
            macro: ['#include <sys/socket.h>'],
            args: 3,
        },
        'connect': {
            macro: ['#include <sys/socket.h>'],
            args: 3,
        },
        'getsockname': {
            macro: ['#include <sys/socket.h>'],
            args: 3,
        },
        'listen': {
            macro: ['#include <sys/socket.h>'],
            args: 2,
        },
        'recv': {
            macro: ['#include <sys/socket.h>'],
            args: 2,
        },
        'recvfrom': {
            macro: ['#include <sys/socket.h>'],
            args: 6,
        },
        'recvmsg': {
            macro: ['#include <sys/socket.h>'],
            args: 2,
        },
        'open': {
            macro: ['#include <unistd.h>'],
            args: 3,
        },
        'creat': {
            macro: ['#include <unistd.h>'],
            args: 2,
        },
        'close': {
            macro: ['#include <unistd.h>'],
            args: 1,
        },
        'read': {
            macro: ['#include <unistd.h>'],
            args: 3,
        },
        'write': {
            macro: ['#include <unistd.h>'],
            args: 3,
        }
    };

})();