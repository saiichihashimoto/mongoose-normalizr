import pluralize from 'mongoose-legacy-pluralize';
import { Schema, VirtualType } from 'mongoose';
import { schema as normalizr, Schema as NormalizrPre3Schema, unionOf } from 'normalizr';

const {
	Entity = NormalizrPre3Schema,
	Union,
} = normalizr || {};

const union = (
	(unionOf && ((schemas, schemaAttribute) => unionOf(schemas, { schemaAttribute }))) ||
	(Union && ((schemas, discriminatorKey) => new Union(schemas, discriminatorKey))) ||
	((schemas, discriminatorKey, normalizrSchema) => normalizrSchema)
);

function getNormalizrSchema(
	{
		reference,
		normalizrSchema,
		discriminate,
		mongooseSchema: {
			_userProvidedOptions: {
				discriminatorKey,
			} = {},
		} = {},
	} = {},
	normalizrSchemas,
) {
	return reference && (
		(discriminate || (discriminate !== false && discriminatorKey)) ?
			union(normalizrSchemas, discriminatorKey || '__t', normalizrSchema) :
			normalizrSchema
	);
}

function createDefinition(tree, mongooseOptions, normalizrSchemas) {
	return Object.entries(tree)
		.filter(([, subTree]) => subTree && typeof (subTree) === 'object')
		.map(([key, subTree]) => {
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

			if (constructor === Schema) {
				return [key, getNormalizrSchema(
					Object.values(mongooseOptions)
						.find(({ mongooseSchema }) => mongooseSchema === subTree),
					normalizrSchemas,
				)];
			}

			if (constructor === VirtualType) {
				if (!ref || !localField || !foreignField) {
					return [key, null];
				}
				const normalizrSchema = getNormalizrSchema(mongooseOptions[ref], normalizrSchemas);
				return [key, normalizrSchema && (justOne ? normalizrSchema : [normalizrSchema])];
			}

			if (subTreeRef) {
				return [key, getNormalizrSchema(mongooseOptions[subTreeRef], normalizrSchemas)];
			}

			const definition = createDefinition(subTree, mongooseOptions, normalizrSchemas);
			return [key, definition && (Array.isArray(subTree) ? [definition[0]] : definition)];
		})
		.filter(([, definition]) => definition)
		.reduce((acc, [key, definition]) => ({
			...acc,
			[key]: definition,
		}), null);
}

export default (input) => {
	const mongooseOptions = Object.entries(input)
		.map(([modelName, schema]) => [
			modelName,
			(schema.constructor === Schema) ?
				{ schema } :
				schema,
		])
		.reduce((acc, [modelName, schemaOptions]) => {
			const {
				schema: mongooseSchema,
				collection = pluralize(modelName),
				enable = true,
				define = true,
				reference = true,
				discriminate,
			} = schemaOptions;

			return {
				...acc,
				[modelName]: {
					collection,
					mongooseSchema,
					normalizrSchema: new Entity(collection),
					define:          enable && define,
					reference:       enable && reference,
					discriminate:    enable && discriminate,
				},
			};
		}, {});

	const normalizrSchemas = Object.entries(mongooseOptions)
		.filter(([, { reference }]) => reference)
		.reduce((acc, [modelName, { normalizrSchema }]) => ({
			...acc,
			[modelName]: normalizrSchema,
		}), {});

	Object.values(mongooseOptions)
		.filter(({ define }) => define)
		.forEach(({ normalizrSchema, mongooseSchema: { tree } }) => {
			normalizrSchema.define(createDefinition(tree, mongooseOptions, normalizrSchemas) || {});
		});

	return Object.values(mongooseOptions)
		.reduce((acc, { collection, normalizrSchema }) => ({
			...acc,
			[collection]: normalizrSchema,
		}), {});
};
