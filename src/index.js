import pluralize from 'mongoose-legacy-pluralize';
import { schema } from 'normalizr';

const findRefs = (resources, tree) => {
	const obj = {};
	for (const [key, subTree] of Object.entries(tree).filter(([, subTree]) => subTree && typeof(subTree) === 'object')) {
		switch (subTree.constructor.name) {
			case 'Schema':
				{
					const { reference, entity } = Object.values(resources).find((resource) => resource.schema === subTree) || {};
					if (!reference) {
						continue;
					}
					obj[key] = entity;
				}
				break;
			case 'VirtualType':
				{
					const { options: { ref, localField, foreignField, justOne } = {} } = subTree;
					if (!ref || !localField || !foreignField) {
						continue;
					}
					const { reference, entity } = resources[ref] || {};
					if (!reference) {
						continue;
					}
					obj[key] = justOne ? entity : [entity];
				}
				break;
			default:
				{
					if (subTree.ref) {
						const { reference, entity } = resources[subTree.ref] || {};
						if (!reference) {
							continue;
						}
						obj[key] = entity;
						continue;
					}
					const subObj = findRefs(resources, subTree);
					if (!subObj) {
						continue;
					}
					obj[key] = Array.isArray(subTree) ? [subObj[0]] : subObj;
				}
				break;
		}
	}
	return Object.keys(obj).length && obj;
};

export default (schemas) => {
	const resources = {};

	for (const [modelName, resource] of Object.entries(schemas)) {
		resources[modelName] = (resource.constructor.name === 'Schema') ? { schema: resource } : { ...resource };
		resources[modelName] = {
			collection: pluralize(modelName),
			enable:     true,
			...resources[modelName],
		};
		resources[modelName] = {
			entity:    new schema.Entity(resources[modelName].collection),
			define:    resources[modelName].enable,
			reference: resources[modelName].enable,
			...resources[modelName],
		};
	}

	for (const resource of Object.values(resources).filter((resource) => resource.define)) {
		resource.entity.define(findRefs(resources, resource.schema.tree) || {});
	}

	return Object.values(resources)
		.reduce((entities, resource) => {
			entities[resource.collection] = resource.entity;
			return entities;
		}, {});
};
