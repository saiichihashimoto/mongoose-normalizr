import pluralize from 'mongoose-legacy-pluralize';
import { Schema, VirtualType } from 'mongoose';
import { schema as normalizr, Schema as NormalizrPre3Schema, unionOf } from 'normalizr';

// TODO Handle mongoose@1.0.0
// TODO Handle mongoose@2.0.0
// TODO Handle mongoose@3.0.0

function reduceEntries(acc, [key, value]) {
	return { ...acc, [key]: value };
}

function mapValue(fn) {
	return ([key, value]) => [key, fn(value)];
}

const {
	Entity = NormalizrPre3Schema,
	Union,
} = normalizr || {};

function getNormalizrSchema(
	modelName,
	{
		[modelName]: {
			reference,
		} = {},
	},
	{
		[modelName]: normalizrSchema,
	},
) {
	return reference && normalizrSchema;
}

function createDefinition(tree, options, normalizrSchemas) {
	return Object.entries(tree)
		.filter(([, subTree]) => subTree && typeof (subTree) === 'object')
		.map(mapValue((subTree) => {
			const {
				constructor,
				ref,
				refPath,
				options: {
					count,
					foreignField,
					justOne,
					localField,
					ref: refOption,
				} = {},
			} = subTree;

			if (constructor === Schema) {
				return getNormalizrSchema(
					Object.keys(options)
						.find((modelName) => options[modelName].mongooseSchema === subTree),
					options,
					normalizrSchemas,
				);
			}

			if (constructor === VirtualType) {
				if (!refOption || !localField || !foreignField || count) {
					return null;
				}
				const normalizrSchema = getNormalizrSchema(refOption, options, normalizrSchemas);
				return normalizrSchema && (justOne ? normalizrSchema : [normalizrSchema]);
			}

			if (refPath && Union) {
				return new Union(normalizrSchemas, (value, parent) => parent[refPath]);
			}

			if (ref) {
				return getNormalizrSchema(ref, options, normalizrSchemas);
			}

			const definition = createDefinition(subTree, options, normalizrSchemas);
			return definition && (Array.isArray(subTree) ? [definition[0]] : definition);
		}))
		.filter(([, definition]) => definition)
		.reduce(reduceEntries, null);
}

const union = (
	(unionOf && ((schemas, schemaAttribute) => unionOf(schemas, { schemaAttribute }))) ||
	(Union && ((schemas, schemaAttribute) => new Union(schemas, schemaAttribute)))
);

export default (input) => {
	const options = Object.entries(input)
		.map(([modelName, schema]) => [
			modelName,
			(schema.constructor === Schema) ?
				{ schema } :
				schema,
		])
		.reduce((acc, [modelName, schemaOptions]) => {
			const {
				schema: mongooseSchema,
				enable = true,
				define = true,
				reference = true,
			} = schemaOptions;
			const {
				options: {
					collection = pluralize(modelName),
				} = {},
			} = mongooseSchema;

			return {
				...acc,
				[modelName]: {
					collection,
					mongooseSchema,
					define:    enable && define,
					reference: enable && reference,
				},
			};
		}, {});

	const normalizrEntities = Object.entries(options)
		.map(mapValue(({ collection }) => new Entity(collection)))
		.reduce(reduceEntries, {});

	const normalizrSchemas = union ?
		{
			...normalizrEntities,
			...Object.entries(options)
				.filter(([, { reference }]) => reference)
				.filter(([, { mongooseSchema: { discriminatorMapping } }]) => discriminatorMapping)
				.map(mapValue(({ mongooseSchema: { options: { discriminatorKey } = {} } }) => (
					union(normalizrEntities, discriminatorKey)
				)))
				.reduce(reduceEntries, {}),
		} :
		normalizrEntities;

	Object.entries(options)
		.filter(([, { define }]) => define)
		.filter(([modelName]) => normalizrSchemas[modelName] instanceof Entity)
		.forEach(([modelName, { mongooseSchema: { tree } }]) => {
			normalizrSchemas[modelName].define(createDefinition(tree, options, normalizrSchemas) || {});
		});

	return Object.entries(options)
		.reduce((acc, [modelName, { collection }]) => ({
			...acc,
			[collection]: normalizrSchemas[modelName],
		}), {});
};
