'use strict';

import * as paths from 'path';
import uri from 'egret/base/common/uri';

/**
 * 资源的名称或者域名
 * @param resource 资源
 */
export function basenameOrAuthority(resource: uri): string {
	return paths.basename(resource.fsPath) || resource.authority;
}

/**
 * 是否等于或者是父子关系
 * @param resource 父级路径
 * @param candidate 子级路径
 */
export function isEqualOrParent(resource: uri, candidate: uri): boolean {
	const resourcePath:string = resource.toString().toLocaleLowerCase();
	const candidatePath:string = candidate.toString().toLocaleLowerCase();
	return resourcePath.indexOf(candidatePath) === 0;
}
/**
 * 判断两个uri是否相等
 * @param first 第一个
 * @param second 第二个
 */
export function isEqual(first: uri, second: uri): boolean {
	if (first === second) {
		return true;
	}
	if (!first || !second) {
		return false;
	}
	return first.toString().toLocaleLowerCase() === second.toString().toLocaleLowerCase();
}

/**
 * 得到父级目录
 * @param resource 目录
 */
export function dirname(resource: uri): uri {
	const dirname = paths.dirname(resource.path);
	if (resource.authority && dirname && !paths.isAbsolute(dirname)) {
		return null; 
	}
	return resource.with({
		path: dirname
	});
}
/**
 * 过滤子路径，如果给定的items里包含父级路径和子级路径，则会过滤掉子路径
 * @param items 
 * @param resourceAccessor 
 */
export function distinctParents<T>(items: T[], resourceAccessor: (item: T) => uri): T[] {
	const distinctParents: T[] = [];
	for (let i = 0; i < items.length; i++) {
		const candidateResource = resourceAccessor(items[i]);
		if (items.some((otherItem, index) => {
			if (index === i) {
				return false;
			}

			return isEqualOrParent(candidateResource, resourceAccessor(otherItem));
		})) {
			continue;
		}

		distinctParents.push(items[i]);
	}

	return distinctParents;
}