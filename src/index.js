import pluralize from 'mongoose-legacy-pluralize';
import { schema } from 'normalizr';

const findRefs = (resources, tree) => {
	const obj = {};
	for (const [key, subTree] of Object.entries(tree).filter(([, subTree]) => subTree && typeof(subTree) === 'object')) {
		switch (subTree.constructor.name) {
			case 'Schema':
				{
					const resource = Object.values(resources).find((resource) => resource.schema === subTree);
					if (!resource) {
						continue;
					}
					obj[key] = resource.entity;
				}
				continue;
			case 'VirtualType':
				{
					const { options } = subTree;
					if (!options || !options.ref || !options.localField || !options.foreignField) {
						continue;
					}
					const { entity } = resources[options.ref];
					obj[key] = options.justOne ? entity : [entity];
				}
				continue;
			default:
				{
					if (subTree.ref) {
						if (!resources[subTree.ref]) {
							continue;
						}
						obj[key] = resources[subTree.ref].entity;
						continue;
					}
					const subObj = findRefs(resources, subTree);
					if (!subObj) {
						continue;
					}
					obj[key] = Array.isArray(subTree) ? [subObj[0]] : subObj;
				}
				continue;
		}
	}
	return Object.keys(obj).length && obj;
};

export default (schemas) => {
	const resources = {};

	for (const [modelName, resource] of Object.entries(schemas)) {
		resources[modelName] = (resource.constructor.name === 'Schema') ? { schema: resource } : { ...resource };
		resources[modelName].collection = resources[modelName].collection || pluralize(modelName);
		resources[modelName].entity = resources[modelName].entity || new schema.Entity(resources[modelName].collection);
	}

	for (const resource of Object.values(resources)) {
		resource.entity.define(findRefs(resources, resource.schema.tree) || {});
	}

	return Object.values(resources)
		.reduce((entities, resource) => {
			entities[resource.collection] = resource.entity;
			return entities;
		}, {});
};
