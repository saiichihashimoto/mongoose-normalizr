import mongoose from 'mongoose';
import test from 'tape';
import mongooseNormalizr from '.';

test('Return Value', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({}),
		Bar: mongoose.Schema({}),
	});

	assert.deepEqual(Object.keys(normalizrs), ['foos', 'bars'], 'keys should be collection names');
	assert.deepEqual(Object.values(normalizrs).map((obj) => obj.constructor.name), ['EntitySchema', 'EntitySchema'], 'values should be normalizr Entities');

	assert.end();
});

test('Ref', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({ bar: { type: mongoose.Schema.Types.ObjectId, ref: 'Bar' } }),
		Bar: mongoose.Schema({ foo: { type: mongoose.Schema.Types.ObjectId, ref: 'Foo' }, other: { type: mongoose.Schema.Types.ObjectId, ref: 'Other' } }),
	});

	assert.deepEqual(normalizrs.foos.schema, { bar: normalizrs.bars }, 'should handle refs');
	assert.equal(normalizrs.bars.schema.foo, normalizrs.foos, 'should handle cyclical refs');
	assert.deepEqual(Object.keys(normalizrs.bars.schema), ['foo'], 'should ignore unknown refs');

	assert.end();
});

test('Traversal', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({ child: { grandchild: { bar: { type: mongoose.Schema.Types.ObjectId, ref: 'Bar' } } } }),
		Bar: mongoose.Schema({ foos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Foo' }] }),
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
