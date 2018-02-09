import pluralize from 'mongoose-legacy-pluralize';
import { Schema, VirtualType } from 'mongoose';
import { schema } from 'normalizr';

const { Entity, Union } = schema;

const getEntityFromResource = ({ reference, entity, discriminate } = {}, entityReference) => reference && (discriminate ? new Union(entityReference, (entity.options && entity.options.discriminatorKey) || '__t') : entity);

const findRefs = (resources, tree, entityReference) => {
	const obj = {};
	for (const [key, subTree] of Object.entries(tree).filter(([, subTree]) => subTree && typeof(subTree) === 'object')) {
		switch (subTree.constructor) {
			case Schema:
				{
					const entity = getEntityFromResource(Object.values(resources).find(({ schema }) => schema === subTree), entityReference);
					if (!entity) {
						continue;
					}
					obj[key] = entity;
				}
				break;
			case VirtualType:
				{
					const { options: { ref, localField, foreignField, justOne } = {} } = subTree;
					if (!ref || !localField || !foreignField) {
						continue;
					}
					const entity = getEntityFromResource(resources[ref], entityReference);
					if (!entity) {
						continue;
					}
					obj[key] = justOne ? entity : [entity];
				}
				break;
			default:
				{
					if (subTree.ref) {
						const entity = getEntityFromResource(resources[subTree.ref], entityReference);
						if (!entity) {
							continue;
						}
						obj[key] = entity;
						continue;
					}
					const subObj = findRefs(resources, subTree, entityReference);
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
	const resources = Object.entries(schemas)
		.reduce((resources, [modelName, resource]) => {
			resources[modelName] = {
				collection: pluralize(modelName),
				enable:     true,
				...((resource.constructor === Schema) ? { schema: resource } : { ...resource }),
			};
			resources[modelName] = {
				entity:       new Entity(resources[modelName].collection),
				define:       resources[modelName].enable,
				reference:    resources[modelName].enable,
				discriminate: resources[modelName].enable && resources[modelName].schema._userProvidedOptions && resources[modelName].schema._userProvidedOptions.discriminatorKey,
				...resources[modelName],
			};
			return resources;
		}, {});

	const entityReference = Object.entries(resources)
		.reduce((entityReference, [modelName, { entity, reference }]) => {
			if (reference) {
				entityReference[modelName] = entity;
			}
			return entityReference;
		}, {});

	for (const { entity, schema: { tree } } of Object.values(resources).filter(({ define }) => define)) {
		entity.define(findRefs(resources, tree, entityReference) || {});
	}

	return Object.values(resources)
		.reduce((entities, { collection, entity }) => {
			entities[collection] = entity;
			return entities;
		}, {});
};
