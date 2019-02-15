import mongoose from 'mongoose';
import { schema as normalizr } from 'normalizr';
import mongooseNormalizr from '.';

describe('mongoose-normalizr', () => {
	it('returns an object of normalizr schemas', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({}),
		});

		expect(normalizrs.foos).toBeInstanceOf(normalizr.Entity);
	});

	it('uses provided collection name for key', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { collection: 'foo', schema: mongoose.Schema({}) },
		});

		expect(normalizrs.foo).toBeInstanceOf(normalizr.Entity);
	});

	it('references schemas using `ref`', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
			Bar: mongoose.Schema({}),
		});

		expect(normalizrs).toHaveProperty('foos.schema.bar', normalizrs.bars);
	});

	it('ignores `ref` of unspecified models', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
		});

		expect(normalizrs).not.toHaveProperty('foos.schema.bar');
	});

	it('references schemas using subdocuments', () => {
		const BarSchema = mongoose.Schema({});

		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: BarSchema }),
			Bar: BarSchema,
		});

		expect(normalizrs).toHaveProperty('foos.schema.bar', normalizrs.bars);
	});

	it('references schemas using populate virtuals', () => {
		const schemas = {
			Foo: mongoose.Schema({ barId: { type: String } }),
			Bar: mongoose.Schema({ fooId: { type: String } }),
		};

		schemas.Foo.virtual('bar', {
			ref:          'Bar',
			localField:   'barId',
			foreignField: 'fooId',
		});

		const normalizrs = mongooseNormalizr(schemas);

		expect(normalizrs).toHaveProperty('foos.schema.bar', [normalizrs.bars]);
	});

	it('references schemas using populate virtuals respecting justOne', () => {
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

		const normalizrs = mongooseNormalizr(schemas);

		expect(normalizrs).toHaveProperty('foos.schema.bar', normalizrs.bars);
	});

	it('ignores populate virtuals of unspecified models', () => {
		const schemas = {
			Foo: mongoose.Schema({ barId: { type: String } }),
		};

		schemas.Foo.virtual('bar', {
			ref:          'Bar',
			localField:   'barId',
			foreignField: 'fooId',
		});

		const normalizrs = mongooseNormalizr(schemas);

		expect(normalizrs).not.toHaveProperty('foos.schema.bar');
	});

	it('traverses into objects', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ child: { grandchild: { bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } } } }),
			Bar: mongoose.Schema({}),
		});

		expect(normalizrs).toHaveProperty('foos.schema.child.grandchild.bar', normalizrs.bars);
	});

	it('traverses into arrays', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bars: [{ ref: 'Bar', type: mongoose.Schema.Types.ObjectId }] }),
			Bar: mongoose.Schema({}),
		});

		expect(normalizrs).toHaveProperty('foos.schema.bars', [normalizrs.bars]);
	});

	it('ignores references if define=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { define: false, schema: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }) },
			Bar: mongoose.Schema({}),
		});

		expect(normalizrs).not.toHaveProperty('foos.schema.bar');
	});

	it('ignores references if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { enable: false, schema: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }) },
			Bar: mongoose.Schema({}),
		});

		expect(normalizrs).not.toHaveProperty('foos.schema.bar');
	});

	it('won\'t be referenced if reference=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { reference: false, schema: mongoose.Schema({}) },
			Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
		});

		expect(normalizrs).not.toHaveProperty('bars.schema.foo');
	});

	it('won\'t be referenced if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { reference: false, schema: mongoose.Schema({}) },
			Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
		});

		expect(normalizrs).not.toHaveProperty('bars.schema.foo');
	});

	it('uses unions if discriminate=true', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { discriminate: true, schema: mongoose.Schema({}) },
			Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
		});

		expect(normalizrs.bars.schema.foo).toBeInstanceOf(normalizr.Union);
		// normalizr uses _schemaAttribute internally to determine the schema
		// mongoose discriminator keys are __t by default
		expect(normalizrs.bars.schema.foo._schemaAttribute({ __t: 'discriminatorKey' })).toBe('discriminatorKey'); // eslint-disable-line no-underscore-dangle
		// the union's schema needs to key schemas by model name to get the correct schema
		expect(normalizrs).toHaveProperty('bars.schema.foo.schema.Foo', normalizrs.foos);
		expect(normalizrs).toHaveProperty('bars.schema.foo.schema.Bar', normalizrs.bars);
	});

	it('uses unions if discriminatorKey', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({}, { discriminatorKey: 'discriminatorKey' }),
			Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
		});

		expect(normalizrs.bars.schema.foo).toBeInstanceOf(normalizr.Union);
		expect(normalizrs.bars.schema.foo._schemaAttribute({ discriminatorKey: 'discriminatorKey' })).toBe('discriminatorKey'); // eslint-disable-line no-underscore-dangle
		expect(normalizrs).toHaveProperty('bars.schema.foo.schema.Foo', normalizrs.foos);
		expect(normalizrs).toHaveProperty('bars.schema.foo.schema.Bar', normalizrs.bars);
	});

	it('won\'t use a union if discriminate=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { discriminate: false, schema: mongoose.Schema({}, { discriminatorKey: 'discriminatorKey' }) },
			Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
		});

		expect(normalizrs.bars.schema.foo).not.toBeInstanceOf(normalizr.Union);
	});

	it('won\'t use a union if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { enable: false, schema: mongoose.Schema({}, { discriminatorKey: 'discriminatorKey' }) },
			Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
		});

		expect(normalizrs.bars.schema.foo).not.toBeInstanceOf(normalizr.Union);
	});
});
