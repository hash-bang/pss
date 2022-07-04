#!/usr/bin/env node

import chalk from 'chalk';
import {Command} from 'commander';
import 'commander-extras';
import {execa} from 'execa';
import fuzzy from 'fuzzy';
import inquirer from 'inquirer';
import inquirerCheckboxPlusPrompt from 'inquirer-checkbox-plus-prompt';
import micromatch from 'micromatch';
import {filterExistingProcesses} from 'process-exists';
import {portToPid} from 'pid-port';
import psList from 'ps-list';
import fkill from 'fkill';
import {stringReplaceLast} from './lib/stringReplaceLast.js';
import timestring from 'timestring';

inquirer.registerPrompt('checkbox-plus', inquirerCheckboxPlusPrompt);

let args = new Command()
	.name('pss')
	.usage('[-k | -z] [globs...]')
	.option('-a, --all', 'Show all processes not just this users')
	.option('-i, --interactive', 'Ask about all found processes')
	.option('-l, --list', 'Show all matching processes')
	.option('-f, --force', 'Force kill processes (implies --kill)')
	.option('-k, --kill', 'Attempt to kill found processes')
	.option('-n, --name', 'Match the name of the command only instead of args')
	.option('-p, --pid <pids...>', 'List of specific Process IDs to limit to')
	.option('-v, --verbose', 'Be verbose about what is happening')
	.option('-w, --wait <time>', 'Wait for a valid timestring before zapping', '3s')
	.option('-z, --zap', 'Try to politely kill a process then agressively (implies --kill)')
	.option('--no-case', 'Disable case insesitive searching')
	.option('--no-sudo', 'Do not try to elevate this process to sudo if possible')
	.option('--no-skip-self', 'Exclude the PSS process from the list')
	.option('--no-surround', 'Disable adding globstars at the start and end of search strings')
	.option('--no-tree', 'Dont attempt to kill all sub-processes on --force / --zap')
	.note('Globs can be any valid string, if the string is numeric and begins with `:` its assumed to be a port e.g. `:80` fetches the process listening on port 80')
	.note('If --kill, --force, --zap and --list are omitted --list is assumed')
	.note('--pid Can take a CSV of PIDs to filter by')
	.parse(process.argv);

args = {args: args.args, ...args.opts()}; // Splice `args` into args key

Promise.resolve()
	// Sanity checks {{{
	.then(()=> {
		if (!args.kill && !args.force && !args.zap && !args.list) args.list = true;
		if (args.force && args.zap) throw new Error('Using --force and --zap together makes no sense');
		if (!args.args.length) [args.args, args.surround] = [['*'], false];

		// Make sure args.pid is always a set
		args.pid = new Set(args.pid ? args.pid.split(/\s*,\s*/) : []);
	})
	// }}}
	// Self sudo {{{
	.then(()=> args.sudo && process.getuid() !== 0 && Promise.resolve()
		.then(()=> execa('sudo', ['--non-interactive', 'echo'])
			.catch(()=> {
				console.warn('Sudo not available - limited to user owned processes only');
				throw 'NEXT';
			})
		)
		.then(()=> execa('sudo', process.argv, {
			stdio: 'inherit',
		}))
		.then(()=> { throw 'EXIT' })
		.catch(e => { if (e !== 'NEXT') throw e })
	)
	// }}}
	.then(()=> Promise.all([
		// Fetch all processes
		psList({all: args.all}),

		// Find any specific port listeners (e.g. `:80 :1234`)
		...args.args
			.filter(a => a.startsWith(':') && isFinite(a.substr(1)))
			.map(a => +a.substr(1))
			.map(port => portToPid(port)
				.then(pid => {
					console.warn('Got PID', pid, 'listening on port', port);
					args.pid.add(pid);
				})
				.catch(()=> console.warn('Cannot find process listening on port', port))
			),
	]))
	.then(([procs]) => {
		let globs = args.args
			.filter(a => !a.startsWith(':') || !isFinite(a.substr(1)))
			.map(a => args.surround ? `*${a}*` : a);

		let isMatch = globs.length > 0
			? micromatch.matcher(globs, {
				contains: true,
				nocase: args.case,
			})
			: ()=> true;

		return procs.filter(p =>
			(!args.skipSelf || p.pid !== process.pid)
			&& (!args.pid || args.pid.has(p.pid))
			&& isMatch(args.name ? p.name : p.cmd)
		);
	})
	.then(procs => {
		if (!args.interactive) return procs;
		return inquirer.prompt([{
			type: 'checkbox-plus',
			name: 'procs',
			message: 'Select processes',
			searchable: true,
			pageSize: 30,
			source: (answers, input) => Promise.resolve(
				fuzzy
					.filter(input, procs, {
						extract: i => i.cmd,
					})
					.map(i => ({name: i.original.cmd, value: i.original}))
			),
		}])
			.then(({procs}) => procs)
	})
	.then(async (procs) => Promise.all(procs.map(proc => {
		if (args.list) {
			console.log(
				chalk.blue.bold(proc.pid),
				stringReplaceLast(proc.cmd, proc.name, v => chalk.bold.white(v)),
			);
		}

		if (args.kill || args.zap) {
			if (!args.list || args.verbose) console.log(
				chalk.red.bold('Politely killing'),
				chalk.blue.bold(proc.pid),
				stringReplaceLast(proc.cmd, proc.name, v => chalk.bold.white(v)),
			);

			return fkill(proc.pid);
		}
	})).then(()=> procs))
	.then(async (procs) => {
		if (!args.zap || !args.wait) return procs;
		let parsedWait = timestring(args.wait, 'ms');
		console.log('Waiting', args.wait, chalk.gray(`(${parsedWait}ms)`));
		await new Promise(resolve => setTimeout(resolve, parsedWait));
		return procs;
	})
	.then(procs => {
		if (args.zap) { // If zapping remove processes that politely exited
			return Promise.all(procs.map(proc => ({
				...proc,
				remains: processExists(proc.pid),
			})))
				.then(procs => procs.filter(proc => proc.remains))
		}
	})
	.then(async (procs) => (args.zap || args.force) && Promise.all(procs.map(proc => {
		if (!args.list || args.verbose) console.log(
			chalk.red.bold.italic('Vilolently killing'),
			chalk.blue.bold(proc.pid),
			stringReplaceLast(proc.cmd, proc.name, v => chalk.bold.white(v)),
		);

		return fkill(proc.pid, {force: true, tree: args.tree});
	})))
	.then(()=> process.exit(0))
	.catch(e => {
		if (e === 'EXIT') {
			process.exit(0);
		} else {
			console.warn(e.toString());
			process.exit(1);
		}
	})
