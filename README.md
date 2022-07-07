@hash-bang/PSS
==============
A nicer `pgrep` / `pkill`.

Features:

* Auto-sudo mode to enable all processes can be killed
* Globbing of process commands, PIDs and open ports are all supported
* `--zap` mode will politely try to kill a process (regular kill), wait then agressively kill (`-9`)
* Fancy colors to make reading the output easier


```
Usage: pss [-k | -z] [globs...]

Options:
  -a, --all            Show all processes not just this users
  -i, --interactive    Ask about all found processes
  -l, --list           Show all matching processes
  -f, --force          Force kill processes (implies --kill)
  -k, --kill           Attempt to kill found processes
  -n, --name           Match the name of the command only instead of args
  -p, --pid <pids...>  CSV of specific Process IDs to limit to (or specify
                       multiple times)
  -v, --verbose        Be verbose about what is happening
  -w, --wait <time>    Wait for a valid timestring before zapping (default:
                       "3s")
  -z, --zap            Try to politely kill a process then agressively (implies
                       --kill)
  --no-case            Disable case insesitive searching
  --no-sudo            Do not try to elevate this process to sudo if possible
  --no-skip-self       Exclude the PSS process from the list
  --no-surround        Disable adding globstars at the start and end of search
                       strings
  --no-tree            Dont attempt to kill all sub-processes on --force /
                       --zap
  -h, --help           display help for command

Notes:
  * Globs can be any valid string, if the string is numeric and begins with `:` its assumed to be a port e.g. `:80` fetches the process listening on port 80
  * If --kill, --force, --zap and --list are omitted --list is assumed
  * --pid Can take a CSV of PIDs to filter by
```
