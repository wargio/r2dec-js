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

(function() { // lgtm [js/useless-expression]
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
        'libc_start_main': {
            macro: [],
            required: 7
        },
        'exit': {
            macro: ['#include <stdlib.h>'],
            required: 1
        },
        'access': {
            macro: ['#include <stdio.h>'],
            required: 2
        },
        'fscanf': {
            macro: ['#include <stdio.h>'],
            required: 2,
            varargs: true
        },
        'fgets': {
            macro: ['#include <stdio.h>'],
            required: 3
        },
        'fclose': {
            macro: ['#include <stdio.h>'],
            required: 1
        },
        'fopen': {
            macro: ['#include <stdio.h>'],
            required: 2
        },
        'fwrite': {
            macro: ['#include <stdio.h>'],
            required: 4
        },
        'fread': {
            macro: ['#include <stdio.h>'],
            required: 4
        },
        'textdomain': {
            macro: ['#include <libintl.h>'],
            required: 2
        },
        'bindtextdomain': {
            macro: ['#include <libintl.h>'],
            required: 2
        },
        'setlocale': {
            macro: ['#include <locale.h>'],
            required: 2
        },
        'wcscmp': {
            macro: ['#include <wchar.h>'],
            required: 2
        },
        'strcmp': {
            macro: ['#include <string.h>'],
            required: 2
        },
        'strncmp': {
            macro: ['#include <string.h>'],
            required: 3
        },
        'msvcrt_dll_memset': {
            macro: ['#include <string.h>'],
            required: 3
        },
        'xmalloc': {
            macro: ['#include <stdlib.h>'],
            required: 1
        },
        'memset': {
            macro: ['#include <string.h>'],
            required: 3
        },
        'memcpy': {
            macro: ['#include <string.h>'],
            required: 3
        },
        'strcpy': {
            macro: ['#include <string.h>'],
            required: 2
        },
        'puts': {
            macro: ['#include <stdio.h>'],
            required: 1
        },
        'fprintf': {
            macro: ['#include <stdio.h>'],
            required: 2,
            varargs: true
        },
        'printf': {
            macro: ['#include <stdio.h>'],
            required: 1,
            varargs: true
        },
        'scanf': {
            macro: ['#include <stdio.h>'],
            required: -1,
            varargs: true
        },
        'getenv': {
            macro: ['#include <stdlib.h>'],
            required: 1
        },
        'time': {
            macro: ['#include <time.h>'],
            required: 1
        },
        'localtime': {
            macro: ['#include <time.h>'],
            required: 1
        },
        'dcgettext': {
            macro: ['#include <libintl.h>'],
            required: 2
        },
        'pthread_create': {
            macro: ['#include <pthread.h>'],
            required: 4,
        },
        'pthread_join': {
            macro: ['#include <pthread.h>'],
            required: 2,
        },
        'pthread_exit': {
            macro: ['#include <pthread.h>'],
            required: 1,
        },
        'pthread_cancel': {
            macro: ['#include <pthread.h>'],
            required: 1,
        },
        'pthread_attr_init': {
            macro: ['#include <pthread.h>'],
            required: 1,
        },
        'pthread_attr_destroy': {
            macro: ['#include <pthread.h>'],
            required: 1,
        },
        'socket': {
            macro: ['#include <pthread.h>'],
            required: 3,
        },
        'accept': {
            macro: ['#include <sys/socket.h>'],
            required: 3,
        },
        'bind': {
            macro: ['#include <sys/socket.h>'],
            required: 3,
        },
        'connect': {
            macro: ['#include <sys/socket.h>'],
            required: 3,
        },
        'getsockname': {
            macro: ['#include <sys/socket.h>'],
            required: 3,
        },
        'listen': {
            macro: ['#include <sys/socket.h>'],
            required: 2,
        },
        'recv': {
            macro: ['#include <sys/socket.h>'],
            required: 2,
        },
        'recvfrom': {
            macro: ['#include <sys/socket.h>'],
            required: 6,
        },
        'recvmsg': {
            macro: ['#include <sys/socket.h>'],
            required: 2,
        },
        'open': {
            macro: ['#include <unistd.h>'],
            required: 3,
        },
        'creat': {
            macro: ['#include <unistd.h>'],
            required: 2,
        },
        'close': {
            macro: ['#include <unistd.h>'],
            required: 1,
        },
        'read': {
            macro: ['#include <unistd.h>'],
            required: 3,
        },
        'write': {
            macro: ['#include <unistd.h>'],
            required: 3,
        },
        'daemon': {
            macro: ['#include <unistd.h>'],
            required: 2,
        },
        'perror': {
            macro: ['#include <stdio.h>'],
            required: 1,
        },
        'shmget': {
            macro: ['#include <sys/shm.h>'],
            required: 3,
        },
        'shmat': {
            macro: ['#include <sys/shm.h>'],
            required: 3,
        },
        'signal': {
            macro: ['#include <signal.h>'],
            required: 1,
        },
        /* iOS */
        'UIApplicationMain': {
            macro: [],
            required: 4,
        },
        'NSStringFromClass': {
            macro: [],
            required: 1,
        },
        'NSLog': {
            macro: [],
            required: 1,
            varargs: true
        }
    };

});