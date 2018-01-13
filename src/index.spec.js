import mongoose from 'mongoose';
import test from 'tape';
import { schema } from 'normalizr';
import mongooseNormalizr from '.';

test('Return Value', (assert) => {
	const normalizrs = mongooseNormalizr({ Foo: mongoose.Schema({}) });

	assert.deepEqual(Object.keys(normalizrs), ['foos'], 'keys should be collection names');
	assert.ok(Object.values(normalizrs)[0] instanceof schema.Entity, 'values should be normalizr Entities');

	assert.end();
});

test('Ref', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({ bar: { type: mongoose.Schema.Types.ObjectId, ref: 'Bar' } }),
		Bar: mongoose.Schema({ foo: { type: mongoose.Schema.Types.ObjectId, ref: 'Foo' } }),
	});

	assert.deepEqual(normalizrs.foos.schema, { bar: normalizrs.bars }, 'should reference normalizr Entity');
	assert.deepEqual(normalizrs.bars.schema, { foo: normalizrs.foos }, 'should handle cyclical references');

	assert.end();
});

test('Deep Ref', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({ child: { grandchild: { bar: { type: mongoose.Schema.Types.ObjectId, ref: 'Bar' } } } }),
		Bar: mongoose.Schema(),
	});

	assert.deepEqual(normalizrs.foos.schema, { child: { grandchild: { bar: normalizrs.bars } } }, 'should traverse objects');

	assert.end();
});

test('Array Ref', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({ bars: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bar' }] }),
		Bar: mongoose.Schema(),
	});

	assert.deepEqual(normalizrs.foos.schema, { bars: [normalizrs.bars] }, 'should traverse arrays');

	assert.end();
});

test('Excluded Ref', (assert) => {
	const normalizrs = mongooseNormalizr({
		Foo: mongoose.Schema({ bar: { type: mongoose.Schema.Types.ObjectId, ref: 'Bar' } }),
	});

	assert.deepEqual(normalizrs.foos.schema, {}, 'should ignore unknown refs');

	assert.end();
});

test('Virtual', (assert) => {
	const schemas = {
		Foo: mongoose.Schema({ localId: { type: String } }),
		Bar: mongoose.Schema({ fooId: { type: String } }),
	};

	schemas.Foo.virtual('bars', {
		ref:          'Bar',
		localField:   'localId',
		foreignField: 'fooId',
	});

	schemas.Bar.virtual('foo', {
		ref:          'Foo',
		localField:   'fooId',
		foreignField: 'localId',
		justOne:      true,
	});

	const normalizrs = mongooseNormalizr(schemas);

	assert.deepEqual(normalizrs.foos.schema, { bars: [normalizrs.bars] }, 'should traverse populateable virtual arrays');
	assert.deepEqual(normalizrs.bars.schema, { foo: normalizrs.foos }, 'should traverse populateable virtual justOne');

	assert.end();
});
