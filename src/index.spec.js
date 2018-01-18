import mongoose from 'mongoose';
import test from 'tape';
import { schema } from 'normalizr';
import mongooseNormalizr from '.';

test('Return Value', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({}),
		Bar: mongoose.Schema({}),
	});

	assert.deepEqual(Object.keys(normalizrs), ['foos', 'bars'], 'keys should be collection names');
	assert.ok(normalizrs.foos instanceof schema.Entity, 'values should be normalizr Entities');
	assert.ok(normalizrs.bars instanceof schema.Entity, 'values should be normalizr Entities');

	assert.end();
});

test('Ref', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
		Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId }, other: { ref: 'Other', type: mongoose.Schema.Types.ObjectId } }),
	});

	assert.deepEqual(normalizrs.foos.schema, { bar: normalizrs.bars }, 'should handle refs');
	assert.equal(normalizrs.bars.schema.foo, normalizrs.foos, 'should handle cyclical refs');
	assert.deepEqual(Object.keys(normalizrs.bars.schema), ['foo'], 'should ignore unknown refs');

	assert.end();
});

test('Disable', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo:        mongoose.Schema({ ignore: { ref: 'Ignore', type: mongoose.Schema.Types.ObjectId }, disable: { ref: 'Disable', type: mongoose.Schema.Types.ObjectId } }),
		DontDefine: { define: false, schema: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }) },
		Ignore:     { reference: false, schema: mongoose.Schema({ }) },
		Disable:    { enable: false, schema: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }) },
	});

	assert.deepEqual(Object.keys(normalizrs), ['foos', 'dontdefines', 'ignores', 'disables'], 'should return entities for define: false, reference: false, enable: false');
	assert.deepEqual(Object.keys(normalizrs.dontdefines.schema), [], 'should have empty refs for define: false');
	assert.deepEqual(Object.keys(normalizrs.disables.schema), [], 'should have empty refs for enable: false');
	assert.deepEqual(Object.keys(normalizrs.foos.schema), [], 'shouldn\'t be referenced when reference: false or enable: false');

	assert.end();
});

test('Traverse', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({ child: { grandchild: { bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } } } }),
		Bar: mongoose.Schema({ foos: [{ ref: 'Foo', type: mongoose.Schema.Types.ObjectId }] }),
	});

	assert.deepEqual(normalizrs.foos.schema, { child: { grandchild: { bar: normalizrs.bars } } }, 'should traverse objects');
	assert.deepEqual(normalizrs.bars.schema, { foos: [normalizrs.foos] }, 'should traverse arrays');

	assert.end();
});

test('Sub Doc', (assert) => {
	const BarSchema = mongoose.Schema({ other: mongoose.Schema() });

	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({ bar: BarSchema, bars: [BarSchema] }),
		Bar: BarSchema,
	});

	assert.equal(normalizrs.foos.schema.bar, normalizrs.bars, 'should handle sub docs');
	assert.deepEqual(normalizrs.foos.schema.bars, [normalizrs.bars], 'should handle sub doc arrays');
	assert.deepEqual(normalizrs.bars.schema, {}, 'should ignore unknown sub docs');

	assert.end();
});

test('Virtual', (assert) => {
	const schemas = {
		Foo: mongoose.Schema({ barId: { type: String } }),
		Bar: mongoose.Schema({ fooId: { type: String } }),
	};

	schemas.Foo.virtual('bar', {
		ref:          'Bar',
		localField:   'barId',
		foreignField: 'fooId',
		justOne:      true,
	});

	schemas.Bar.virtual('foos', {
		ref:          'Foo',
		localField:   'barId',
		foreignField: 'fooId',
	});

	schemas.Bar.virtual('other', {
		ref:          'Other',
		localField:   'barId',
		foreignField: 'otherId',
		justOne:      true,
	});

	const normalizrs = mongooseNormalizr(schemas);

	assert.deepEqual(normalizrs.foos.schema, { bar: normalizrs.bars }, 'should handle virtuals');
	assert.deepEqual(normalizrs.bars.schema.foos, [normalizrs.foos], 'should handle virtual arrays');
	assert.deepEqual(Object.keys(normalizrs.bars.schema), ['foos'], 'should ignore unknown virtuals');

	assert.end();
});

test('Discriminator', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo:              { discriminate: true, schema: mongoose.Schema({ key: { type: String } }) },
		SpecialFoo:       mongoose.Schema({ key2: { type: String } }),
		FooContainer:     mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
		Bar:              mongoose.Schema({ key: { type: String } }, { discriminatorKey: 'kind' }),
		SpecialBar:       mongoose.Schema({ key2: { type: String } }),
		BarContainer:     mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
		Other:            { discriminate: false, schema: mongoose.Schema({ key: { type: String } }, { discriminatorKey: 'kind' }) },
		SpecialOther:     mongoose.Schema({ key2: { type: String } }),
		OtherContainer:   mongoose.Schema({ other: { ref: 'Other', type: mongoose.Schema.Types.ObjectId } }),
		Another:          { enable: false, schema: mongoose.Schema({ key: { type: String } }, { discriminatorKey: 'category' }) },
		SpecialAnother:   mongoose.Schema({ key2: { type: String } }),
		AnotherContainer: mongoose.Schema({ another: { ref: 'Another', type: mongoose.Schema.Types.ObjectId } }),
	});

	const expectedUnionDefinition = {
		Foo:              normalizrs.foos,
		SpecialFoo:       normalizrs.specialfoos,
		FooContainer:     normalizrs.foocontainers,
		Bar:              normalizrs.bars,
		SpecialBar:       normalizrs.specialbars,
		BarContainer:     normalizrs.barcontainers,
		Other:            normalizrs.others,
		SpecialOther:     normalizrs.specialothers,
		OtherContainer:   normalizrs.othercontainers,
		/*
		 * Another isn't included because reference: false aren't referenced and enable: false does that
		 *
		 * Another:          normalizrs.anothers,
		 */
		SpecialAnother:   normalizrs.specialanothers,
		AnotherContainer: normalizrs.anothercontainers,
	};

	assert.ok(normalizrs.foocontainers.schema.foo instanceof schema.Union, 'should return normalizr unions for discriminated');
	assert.ok(normalizrs.foos instanceof schema.Entity, 'should return normalizr entity for returned schema, even when discriminated');
	assert.deepEqual(normalizrs.foocontainers.schema.foo.schema, expectedUnionDefinition, 'should map to normalizr entities (except for reference: false)');
	assert.pass('TODO Test if the schemaAttribute function uses `__t`');
	assert.ok(normalizrs.barcontainers.schema.bar instanceof schema.Union, 'should return normalizr unions for schemas with a discriminatorKey');
	assert.deepEqual(normalizrs.barcontainers.schema.bar.schema, expectedUnionDefinition, 'should map to normalizr entities (except for reference: false)');
	assert.pass('TODO Test if the schemaAttribute function uses `kind`');
	assert.ok(normalizrs.othercontainers.schema.other instanceof schema.Entity, 'should not return normalizr unions for discriminate: false despite discriminatorKey');
	assert.deepEqual(normalizrs.anothercontainers.schema, {}, 'should not return normalizr unions for enable: false despite discriminatorKey');

	assert.end();
});
