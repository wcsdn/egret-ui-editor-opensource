import { isWindows,isLinux } from 'egret/base/common/platform';
import { CharCode } from 'egret/base/common/charCode';
import { startsWithIgnoreCase, equalsIgnoreCase } from 'egret/base/common/strings';

/**
 * The forward slash path separator.
 */
export const sep = '/';

/**
 * The native path separator depending on the OS.
 */
export const nativeSep = isWindows ? '\\' : '/';

/**
 * The forward slash path separator.
 */
export function relative(from: string, to: string): string {
	const originalNormalizedFrom = normalize(from);
	const originalNormalizedTo = normalize(to);

	// we're assuming here that any non=linux OS is case insensitive
	// so we must compare each part in its lowercase form
	const normalizedFrom = isLinux ? originalNormalizedFrom : originalNormalizedFrom.toLowerCase();
	const normalizedTo = isLinux ? originalNormalizedTo : originalNormalizedTo.toLowerCase();

	const fromParts = normalizedFrom.split(sep);
	const toParts = normalizedTo.split(sep);

	let i = 0, max = Math.min(fromParts.length, toParts.length);

	for (; i < max; i++) {
		if (fromParts[i] !== toParts[i]) {
			break;
		}
	}

	const result = [
		...fill(fromParts.length - i, () => '..'),
		...originalNormalizedTo.split(sep).slice(i)
	];

	return result.join(sep);
}

export function fill<T>(num: number, valueFn: () => T, arr: T[] = []): T[] {
	for (let i = 0; i < num; i++) {
		arr[i] = valueFn();
	}

	return arr;
}

/**
 * @returns the directory name of a path.
 */
export function dirname(path: string): string {
	const idx = ~path.lastIndexOf('/') || ~path.lastIndexOf('\\');
	if (idx === 0) {
		return '.';
	} else if (~idx === 0) {
		return path[0];
	} else {
		let res = path.substring(0, ~idx);
		if (isWindows && res[res.length - 1] === ':') {
			res += nativeSep; // make sure drive letters end with backslash
		}
		return res;
	}
}

/**
 * @returns the base name of a path.
 */
export function basename(path: string): string {
	const idx = ~path.lastIndexOf('/') || ~path.lastIndexOf('\\');
	if (idx === 0) {
		return path;
	} else if (~idx === path.length - 1) {
		return basename(path.substring(0, path.length - 1));
	} else {
		return path.substr(~idx + 1);
	}
}

/**
 * @returns {{.far}} from boo.far or the empty string.
 */
export function extname(path: string): string {
	path = basename(path);
	const idx = ~path.lastIndexOf('.');
	return idx ? path.substring(~idx) : '';
}

export const join: (...parts: string[]) => string = function () {
	// Not using a function with var-args because of how TS compiles
	// them to JS - it would result in 2*n runtime cost instead
	// of 1*n, where n is parts.length.

	let value = '';
	for (let i = 0; i < arguments.length; i++) {
		const part = arguments[i];
		if (i > 0) {
			// add the separater between two parts unless
			// there already is one
			const last = value.charCodeAt(value.length - 1);
			if (last !== CharCode.Slash && last !== CharCode.Backslash) {
				const next = part.charCodeAt(0);
				if (next !== CharCode.Slash && next !== CharCode.Backslash) {

					value += sep;
				}
			}
		}
		value += part;
	}

	return normalize(value);
};

export function normalize(path: string, toOSPath?: boolean): string {

	if (path === null || path === void 0) {
		return path;
	}

	const len = path.length;
	if (len === 0) {
		return '.';
	}

	const wantsBackslash = isWindows && toOSPath;
	if (_isNormal(path, wantsBackslash)) {
		return path;
	}

	const sep = wantsBackslash ? '\\' : '/';
	const root = getRoot(path, sep);

	// skip the root-portion of the path
	let start = root.length;
	let skip = false;
	let res = '';

	for (let end = root.length; end <= len; end++) {

		// either at the end or at a path-separator character
		if (end === len || path.charCodeAt(end) === CharCode.Slash || path.charCodeAt(end) === CharCode.Backslash) {

			if (streql(path, start, end, '..')) {
				// skip current and remove parent (if there is already something)
				const prev_start = res.lastIndexOf(sep);
				const prev_part = res.slice(prev_start + 1);
				if ((root || prev_part.length > 0) && prev_part !== '..') {
					res = prev_start === -1 ? '' : res.slice(0, prev_start);
					skip = true;
				}
			} else if (streql(path, start, end, '.') && (root || res || end < len - 1)) {
				// skip current (if there is already something or if there is more to come)
				skip = true;
			}

			if (!skip) {
				const part = path.slice(start, end);
				if (res !== '' && res[res.length - 1] !== sep) {
					res += sep;
				}
				res += part;
			}
			start = end + 1;
			skip = false;
		}
	}

	return root + res;
}

function streql(value: string, start: number, end: number, other: string): boolean {
	return start + other.length === end && value.indexOf(other, start) === start;
}

export function getRoot(path: string, sep: string = '/'): string {

	if (!path) {
		return '';
	}

	const len = path.length;
	let code = path.charCodeAt(0);
	if (code === CharCode.Slash || code === CharCode.Backslash) {

		code = path.charCodeAt(1);
		if (code === CharCode.Slash || code === CharCode.Backslash) {
			// UNC candidate \\localhost\shares\ddd
			//               ^^^^^^^^^^^^^^^^^^^
			code = path.charCodeAt(2);
			if (code !== CharCode.Slash && code !== CharCode.Backslash) {
				let pos = 3;
				const start = pos;
				for (; pos < len; pos++) {
					code = path.charCodeAt(pos);
					if (code === CharCode.Slash || code === CharCode.Backslash) {
						break;
					}
				}
				code = path.charCodeAt(pos + 1);
				if (start !== pos && code !== CharCode.Slash && code !== CharCode.Backslash) {
					pos += 1;
					for (; pos < len; pos++) {
						code = path.charCodeAt(pos);
						if (code === CharCode.Slash || code === CharCode.Backslash) {
							return path.slice(0, pos + 1) // consume this separator
								.replace(/[\\/]/g, sep);
						}
					}
				}
			}
		}

		// /user/far
		// ^
		return sep;

	} else if ((code >= CharCode.A && code <= CharCode.Z) || (code >= CharCode.a && code <= CharCode.z)) {
		// check for windows drive letter c:\ or c:

		if (path.charCodeAt(1) === CharCode.Colon) {
			code = path.charCodeAt(2);
			if (code === CharCode.Slash || code === CharCode.Backslash) {
				// C:\fff
				// ^^^
				return path.slice(0, 2) + sep;
			} else {
				// C:
				// ^^
				return path.slice(0, 2);
			}
		}
	}

	// check for URI
	// scheme://authority/path
	// ^^^^^^^^^^^^^^^^^^^
	let pos = path.indexOf('://');
	if (pos !== -1) {
		pos += 3; // 3 -> "://".length
		for (; pos < len; pos++) {
			code = path.charCodeAt(pos);
			if (code === CharCode.Slash || code === CharCode.Backslash) {
				return path.slice(0, pos + 1); // consume this separator
			}
		}
	}

	return '';
}

const _posixBadPath = /(\/\.\.?\/)|(\/\.\.?)$|^(\.\.?\/)|(\/\/+)|(\\)/;
const _winBadPath = /(\\\.\.?\\)|(\\\.\.?)$|^(\.\.?\\)|(\\\\+)|(\/)/;

function _isNormal(path: string, win: boolean): boolean {
	return win
		? !_winBadPath.test(path)
		: !_posixBadPath.test(path);
}

export function isAbsolute(path: string): boolean {
	return isWindows ?
		isAbsolute_win32(path) :
		isAbsolute_posix(path);
}

export function isAbsolute_win32(path: string): boolean {
	if (!path) {
		return false;
	}

	const char0 = path.charCodeAt(0);
	if (char0 === CharCode.Slash || char0 === CharCode.Backslash) {
		return true;
	} else if ((char0 >= CharCode.A && char0 <= CharCode.Z) || (char0 >= CharCode.a && char0 <= CharCode.z)) {
		if (path.length > 2 && path.charCodeAt(1) === CharCode.Colon) {
			const char2 = path.charCodeAt(2);
			if (char2 === CharCode.Slash || char2 === CharCode.Backslash) {
				return true;
			}
		}
	}

	return false;
}

export function isAbsolute_posix(path: string): boolean {
	return path && path.charCodeAt(0) === CharCode.Slash;
}


export function isEqualOrParent(path: string, candidate: string): boolean {
	if (path === candidate) {
		return true;
	}

	if (!path || !candidate) {
		return false;
	}

	if (candidate.length > path.length) {
		return false;
	}

		const beginsWith = startsWithIgnoreCase(path, candidate);
		if (!beginsWith) {
			return false;
		}

		if (candidate.length === path.length) {
			return true; // same path, different casing
		}

		let sepOffset = candidate.length;
		if (candidate.charAt(candidate.length - 1) === nativeSep) {
			sepOffset--; // adjust the expected sep offset in case our candidate already ends in separator character
		}

		return path.charAt(sepOffset) === nativeSep;
}

export function isEqual(pathA: string, pathB: string): boolean {
	if (!pathA || !pathB) {
		return false;
	}
	return equalsIgnoreCase(pathA, pathB);
}


const INVALID_FILE_CHARS = isWindows ? /[\\/:\*\?"<>\|]/g : /[\\/]/g;
const WINDOWS_FORBIDDEN_NAMES = /^(con|prn|aux|clock\$|nul|lpt[0-9]|com[0-9])$/i;
export function isValidBasename(name: string): boolean {
	if (!name || name.length === 0 || /^\s+$/.test(name)) {
		return false; // require a name that is not just whitespace
	}

	INVALID_FILE_CHARS.lastIndex = 0; // the holy grail of software development
	if (INVALID_FILE_CHARS.test(name)) {
		return false; // check for certain invalid file characters
	}

	if (isWindows && WINDOWS_FORBIDDEN_NAMES.test(name)) {
		return false; // check for certain invalid file names
	}

	if (name === '.' || name === '..') {
		return false; // check for reserved values
	}

	if (isWindows && name[name.length - 1] === '.') {
		return false; // Windows: file cannot end with a "."
	}

	if (isWindows && name.length !== name.trim().length) {
		return false; // Windows: file cannot end with a whitespace
	}

	return true;
}