import pluralize from 'mongoose-legacy-pluralize';
import { schema } from 'normalizr';

const findRefs = (entities, resources, tree) => {
	const obj = {};
	for (const [key, subTree] of Object.entries(tree)) {
		if (subTree && typeof(subTree) !== 'object') {
			continue;
		}
		const refAble = subTree.constructor.name === 'VirtualType' ? (subTree.options || {}) : subTree;
		if (!refAble.ref) {
			const subObj = findRefs(entities, resources, subTree);
			if (!subObj) {
				continue;
			}
			obj[key] = Array.isArray(subTree) ? [subObj[0]] : subObj;
			continue;
		}
		if (!resources[refAble.ref]) {
			continue;
		}
		const entity = entities[resources[refAble.ref].collection];
		if (refAble.localField || refAble.foreignField) {
			obj[key] = refAble.justOne ? entity : [entity];
			continue;
		}
		obj[key] = entity;
	}
	return Object.keys(obj).length && obj;
};

export default (schemas) => {
	const resources = {};
	const entities = {};

	for (const [modelName, resource] of Object.entries(schemas)) {
		resources[modelName] = (resource.constructor === Object) ? { ...resource } : { schema: resource };
		resources[modelName] = { ...resources[modelName], collection: resources[modelName].collection || pluralize(modelName) };
	}

	for (const resource of Object.values(resources)) {
		entities[resource.collection] = new schema.Entity(resource.collection);
	}

	for (const resource of Object.values(resources)) {
		entities[resource.collection].define(findRefs(entities, resources, resource.schema.tree) || {});
	}

	return entities;
};
