import {regexpEscape} from './regexpEscape.js';

/**
* Replace the LAST occurance of a string with another
* @param {string} str The input string to operate on
* @param {RegExp|string} match The match to replace
* @param {string|function} replace Either the replacement string or a function which will provide it
* @returns {string} The input string with replacements (if any)
* @url https://github.com/MomsFriendlyDevCo/Nodash
*/
export function stringReplaceLast(str, match, replace) {
	let lastMatch = Array.from(
		str.matchAll(match instanceof RegExp ? match : new RegExp(regexpEscape(match), 'g')),
	).at(-1);

	return lastMatch
		? str.substring(0, lastMatch.index)
		+ (typeof replace == 'function' ? replace(match) : replace)
		+ str.substring(lastMatch.index + lastMatch[0].length)
		: str;
}
