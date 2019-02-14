import pluralize from 'mongoose-legacy-pluralize';
import { Schema, VirtualType } from 'mongoose';
import { schema as normalizr } from 'normalizr';

const { Entity, Union } = normalizr;

function getEntityFromResource({ reference, entity, discriminate, schema } = {}, entityReference) {
	const { _userProvidedOptions: { discriminatorKey } = {} } = schema || {};

	return reference && (
		(discriminate || (discriminate !== false && discriminatorKey)) ?
			new Union(entityReference, discriminatorKey || '__t') :
			entity
	);
}

function findRefs(resources, tree, entityReference) {
	const obj = Object.entries(tree)
		.filter(([, subTree]) => subTree && typeof (subTree) === 'object')
		.reduce((acc, [key, subTree]) => {
			const {
				constructor,
				options: {
					foreignField,
					justOne,
					localField,
					ref,
				} = {},
				ref: subTreeRef,
			} = subTree;

			let definition;
			switch (constructor) {
				case Schema:
					definition = getEntityFromResource(
						Object.values(resources)
							.find(({ schema }) => schema === subTree),
						entityReference,
					);
					break;
				case VirtualType:
					if (ref && localField && foreignField) {
						const entity = getEntityFromResource(resources[ref], entityReference);
						definition = entity && (justOne ? entity : [entity]);
					}
					break;
				default:
					if (subTreeRef) {
						definition = getEntityFromResource(resources[subTreeRef], entityReference);
					} else {
						const subObj = findRefs(resources, subTree, entityReference);
						definition = subObj && (Array.isArray(subTree) ? [subObj[0]] : subObj);
					}
					break;
			}
			if (definition) {
				acc[key] = definition;
			}
			return acc;
		}, {});

	return Object.keys(obj).length && obj;
}

export default (schemas) => {
	const resources = Object.entries(schemas)
		.reduce((acc, [modelName, resource]) => {
			const options = (resource.constructor === Schema) ?
				{ schema: resource } :
				resource;

			const {
				collection = pluralize(modelName),
				enable = true,
				define = true,
				reference = true,
				schema,
				discriminate,
			} = options;

			acc[modelName] = {
				collection,
				schema,
				entity:       new Entity(collection),
				define:       enable && define,
				reference:    enable && reference,
				discriminate: enable && discriminate,
			};

			return acc;
		}, {});

	const entityReference = Object.entries(resources)
		.reduce((acc, [modelName, { entity, reference }]) => (
			reference ? { ...acc, [modelName]: entity } : acc
		), {});

	Object.values(resources)
		.filter(({ define }) => define)
		.forEach(({ entity, schema: { tree } }) => {
			entity.define(findRefs(resources, tree, entityReference) || {});
		});

	return Object.values(resources)
		.reduce((acc, { collection, entity }) => ({ ...acc, [collection]: entity }), {});
};
