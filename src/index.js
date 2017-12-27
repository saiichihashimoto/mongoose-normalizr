import { schema } from 'normalizr';

export default (schemas, collections) => {
	const entities = {};

	for (const modelName of Object.keys(schemas)) {
		const collection = collections[modelName];
		entities[collection] = new schema.Entity(collection);
	}

	for (const [modelName, mongooseSchema] of Object.entries(schemas)) {
		const collection = collections[modelName];
		const entity = entities[collection];

		const recurse = (tree) => {
			const obj = {};
			for (const [key, value] of Object.entries(tree)) {
				if (value && typeof(value) !== 'object') {
					continue;
				}
				if (!value.ref) {
					const subObj = recurse(value);
					if (!subObj) {
						continue;
					}
					obj[key] = Array.isArray(value) ? [subObj[0]] : subObj;
					continue;
				}
				const collection = collections[value.ref];
				if (!entities[collection]) {
					continue;
				}
				if (value.localField || value.foreignField) {
					obj[key] = value.justOne ? entities[collection] : [entities[collection]];
					continue;
				}
				obj[key] = entities[collection];
			}
			return Object.keys(obj).length && obj;
		};

		const definition = recurse(mongooseSchema.tree);

		if (!definition) {
			continue;
		}

		entity.define(definition);
	}

	return entities;
};
