import { Schema } from 'mongoose';
import { schema } from 'normalizr';
import mongooseNormalizr from '.';

describe('mongoose-normalizr', () => {
	it('returns an object of normalizr entities', () => {
		const normalizrs = mongooseNormalizr({
			Foo: Schema({}),
		});

		expect(normalizrs.foos).toBeInstanceOf(schema.Entity);
	});

	it('uses provided collection name for key', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { collection: 'foo', schema: Schema({}) },
		});

		expect(normalizrs.foo).toBeInstanceOf(schema.Entity);
	});

	it('references entities using `ref`', () => {
		const normalizrs = mongooseNormalizr({
			Foo: Schema({ bar: { ref: 'Bar', type: Schema.Types.ObjectId } }),
			Bar: Schema({}),
		});

		expect(normalizrs).toHaveProperty('foos.schema.bar', normalizrs.bars);
	});

	it('ignores `ref` referencing unspecified models', () => {
		const normalizrs = mongooseNormalizr({
			Foo: Schema({ bar: { ref: 'Bar', type: Schema.Types.ObjectId } }),
		});

		expect(normalizrs).not.toHaveProperty('foos.schema.bar');
	});

	it('references entities using subdocuments', () => {
		const BarSchema = Schema({});

		const normalizrs = mongooseNormalizr({
			Foo: Schema({ bar: BarSchema }),
			Bar: BarSchema,
		});

		expect(normalizrs).toHaveProperty('foos.schema.bar', normalizrs.bars);
	});

	it('references entities using populate virtuals', () => {
		const schemas = {
			Foo: Schema({ barId: { type: String } }),
			Bar: Schema({ fooId: { type: String } }),
		};

		schemas.Foo.virtual('bar', {
			ref:          'Bar',
			localField:   'barId',
			foreignField: 'fooId',
		});

		const normalizrs = mongooseNormalizr(schemas);

		expect(normalizrs).toHaveProperty('foos.schema.bar', [normalizrs.bars]);
	});

	it('references entities using populate virtuals respecting justOne', () => {
		const schemas = {
			Foo: Schema({ barId: { type: String } }),
			Bar: Schema({ fooId: { type: String } }),
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

	it('ignores populate virtuals referencing unspecified models', () => {
		const schemas = {
			Foo: Schema({ barId: { type: String } }),
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
			Foo: Schema({ child: { grandchild: { bar: { ref: 'Bar', type: Schema.Types.ObjectId } } } }),
			Bar: Schema({}),
		});

		expect(normalizrs).toHaveProperty('foos.schema.child.grandchild.bar', normalizrs.bars);
	});

	it('traverses into arrays', () => {
		const normalizrs = mongooseNormalizr({
			Foo: Schema({ bars: [{ ref: 'Bar', type: Schema.Types.ObjectId }] }),
			Bar: Schema({}),
		});

		expect(normalizrs).toHaveProperty('foos.schema.bars', [normalizrs.bars]);
	});

	it('ignores references if define=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { define: false, schema: Schema({ bar: { ref: 'Bar', type: Schema.Types.ObjectId } }) },
			Bar: Schema({}),
		});

		expect(normalizrs).not.toHaveProperty('foos.schema.bar');
	});

	it('ignores references if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { enable: false, schema: Schema({ bar: { ref: 'Bar', type: Schema.Types.ObjectId } }) },
			Bar: Schema({}),
		});

		expect(normalizrs).not.toHaveProperty('foos.schema.bar');
	});

	it('won\'t be referenced if reference=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { reference: false, schema: Schema({}) },
			Bar: Schema({ foo: { ref: 'Foo', type: Schema.Types.ObjectId } }),
		});

		expect(normalizrs).not.toHaveProperty('bars.schema.foo');
	});

	it('won\'t be referenced if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { reference: false, schema: Schema({}) },
			Bar: Schema({ foo: { ref: 'Foo', type: Schema.Types.ObjectId } }),
		});

		expect(normalizrs).not.toHaveProperty('bars.schema.foo');
	});

	it('references unions using `ref` to a schema with discriminate=true', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { discriminate: true, schema: Schema({}) },
			Bar: Schema({ foo: { ref: 'Foo', type: Schema.Types.ObjectId } }),
		});

		expect(normalizrs.bars.schema.foo).toBeInstanceOf(schema.Union);
		// normalizr uses _schemaAttribute internally to determine the schema
		// mongoose discriminator keys are __t by default
		expect(normalizrs.bars.schema.foo._schemaAttribute({ __t: 'discriminatorKey' })).toBe('discriminatorKey'); // eslint-disable-line no-underscore-dangle
		// the union's schema needs to key schemas by model name to get the correct schema
		expect(normalizrs).toHaveProperty('bars.schema.foo.schema.Foo', normalizrs.foos);
		expect(normalizrs).toHaveProperty('bars.schema.foo.schema.Bar', normalizrs.bars);
	});

	it('references unions using `ref` to schemas with a discriminatorKey', () => {
		const normalizrs = mongooseNormalizr({
			Foo: Schema({}, { discriminatorKey: 'discriminatorKey' }),
			Bar: Schema({ foo: { ref: 'Foo', type: Schema.Types.ObjectId } }),
		});

		expect(normalizrs.bars.schema.foo).toBeInstanceOf(schema.Union);
		expect(normalizrs.bars.schema.foo._schemaAttribute({ discriminatorKey: 'discriminatorKey' })).toBe('discriminatorKey'); // eslint-disable-line no-underscore-dangle
		expect(normalizrs).toHaveProperty('bars.schema.foo.schema.Foo', normalizrs.foos);
		expect(normalizrs).toHaveProperty('bars.schema.foo.schema.Bar', normalizrs.bars);
	});

	it('won\'t be a union if discriminate=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { discriminate: false, schema: Schema({}, { discriminatorKey: 'discriminatorKey' }) },
			Bar: Schema({ foo: { ref: 'Foo', type: Schema.Types.ObjectId } }),
		});

		expect(normalizrs.bars.schema.foo).not.toBeInstanceOf(schema.Union);
	});

	it('won\'t be a union if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { enable: false, schema: Schema({}, { discriminatorKey: 'discriminatorKey' }) },
			Bar: Schema({ foo: { ref: 'Foo', type: Schema.Types.ObjectId } }),
		});

		expect(normalizrs.bars.schema.foo).not.toBeInstanceOf(schema.Union);
	});
});
