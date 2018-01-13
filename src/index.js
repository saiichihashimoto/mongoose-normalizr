import pluralize from 'mongoose-legacy-pluralize';
import { schema } from 'normalizr';

const findRefs = (entities, resources, tree) => {
	const obj = {};
	for (const [key, subTree] of Object.entries(tree)) {
		if (subTree && typeof(subTree) !== 'object') {
			continue;
		}
		if (subTree.constructor.name === 'Schema') {
			const resource = Object.values(resources).find((resource) => resource.schema === subTree);
			if (!resource) {
				continue;
			}
			obj[key] = entities[resource.collection];
			continue;
		}
		if (subTree.constructor.name === 'VirtualType') {
			const { options } = subTree;
			if (!options || !options.ref || !options.localField || !options.foreignField) {
				continue;
			}
			const entity = entities[resources[options.ref].collection];
			obj[key] = options.justOne ? entity : [entity];
			continue;
		}
		if (!subTree.ref) {
			const subObj = findRefs(entities, resources, subTree);
			if (!subObj) {
				continue;
			}
			obj[key] = Array.isArray(subTree) ? [subObj[0]] : subObj;
			continue;
		}
		if (!resources[subTree.ref]) {
			continue;
		}
		obj[key] = entities[resources[subTree.ref].collection];
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
