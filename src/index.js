import { schema } from 'normalizr';
import { toCollectionName } from 'mongoose/lib/utils';

const findRefs = (entities, resources, tree) => {
	const obj = {};
	for (const [key, value] of Object.entries(tree)) {
		if (value && typeof(value) !== 'object') {
			continue;
		}
		if (!value.ref) {
			const subObj = findRefs(entities, resources, value);
			if (!subObj) {
				continue;
			}
			obj[key] = Array.isArray(value) ? [subObj[0]] : subObj;
			continue;
		}
		const entity = entities[resources[value.ref].collection];
		if (!entity) {
			continue;
		}
		if (value.localField || value.foreignField) {
			obj[key] = value.justOne ? entity : [entity];
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
		resources[modelName] = { ...resources[modelName], collection: resources[modelName].collection || toCollectionName(modelName) };
	}

	for (const resource of Object.values(resources)) {
		entities[resource.collection] = new schema.Entity(resource.collection);
	}

	for (const resource of Object.values(resources)) {
		entities[resource.collection].define(findRefs(entities, resources, resource.schema.tree) || {});
	}

	return entities;
};
