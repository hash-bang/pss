@hash-bang/PSS
==============
A nicer `pgrep` / `pkill`.

```
Usage: pss [-k | -z] [globs...]

Options:
  -a, --all          Show all processes not just this users
  -i, --interactive  Ask about all found processes
  -l, --list         Show all matching processes
  -f, --force        Force kill processes (implies --kill)
  -k, --kill         Attempt to kill found processes
  -n, --name         Match the name of the command only instead of args
  -v, --verbose      Be verbose about what is happening
  -w, --wait <time>  Wait for a valid timestring before zapping (default: "3s")
  -z, --zap          Try to politely kill a process then agressively (implies
                     --kill)
  --no-case          Disable case insesitive searching
  --no-skip-self     Exclude the PSS process from the list
  --no-surround      Disable adding globstars at the start and end of search
                     strings
  -h, --help         display help for command

Notes:
  * If --kill, --force, --zap and --list are omitted --list is assumed
```
