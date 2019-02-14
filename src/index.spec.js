import { Schema } from 'mongoose';
import { schema } from 'normalizr';
import mongooseNormalizr from '.';

describe('mongoose-normalizr', () => {
	it('Return Value', () => {
		const normalizrs = mongooseNormalizr({
			Foo: Schema({}),
			Bar: Schema({}),
		});

		expect(Object.keys(normalizrs)).toEqual(['foos', 'bars']);
		expect(normalizrs.foos).toBeInstanceOf(schema.Entity);
		expect(normalizrs.bars).toBeInstanceOf(schema.Entity);
	});

	it('Ref', () => {
		const normalizrs = mongooseNormalizr({
			Foo: Schema({ bar: { ref: 'Bar', type: Schema.Types.ObjectId } }),
			Bar: Schema({ foo: { ref: 'Foo', type: Schema.Types.ObjectId }, other: { ref: 'Other', type: Schema.Types.ObjectId } }),
		});

		expect(normalizrs).toHaveProperty('foos.schema.bar', normalizrs.bars);
		expect(normalizrs).toHaveProperty('bars.schema.foo', normalizrs.foos);
		expect(Object.keys(normalizrs.bars.schema)).toEqual(['foo']);
	});

	it('Disable', () => {
		const normalizrs = mongooseNormalizr({
			Foo:        Schema({ ignore: { ref: 'Ignore', type: Schema.Types.ObjectId }, disable: { ref: 'Disable', type: Schema.Types.ObjectId } }),
			DontDefine: { define: false, schema: Schema({ foo: { ref: 'Foo', type: Schema.Types.ObjectId } }) },
			Ignore:     { reference: false, schema: Schema({ }) },
			Disable:    { enable: false, schema: Schema({ foo: { ref: 'Foo', type: Schema.Types.ObjectId } }) },
		});

		expect(Object.keys(normalizrs)).toEqual(['foos', 'dontdefines', 'ignores', 'disables']);
		expect(Object.keys(normalizrs.dontdefines.schema)).toEqual([]);
		expect(Object.keys(normalizrs.disables.schema)).toEqual([]);
		expect(Object.keys(normalizrs.foos.schema)).toEqual([]);
	});

	it('Traverse', () => {
		const normalizrs = mongooseNormalizr({
			Foo: Schema({ child: { grandchild: { bar: { ref: 'Bar', type: Schema.Types.ObjectId } } } }),
			Bar: Schema({ foos: [{ ref: 'Foo', type: Schema.Types.ObjectId }] }),
		});

		expect(normalizrs).toHaveProperty('foos.schema', { child: { grandchild: { bar: normalizrs.bars } } });
		expect(normalizrs).toHaveProperty('bars.schema', { foos: [normalizrs.foos] });
	});

	it('Sub Doc', () => {
		const BarSchema = Schema({ other: Schema() });

		const normalizrs = mongooseNormalizr({
			Foo: Schema({ bar: BarSchema, bars: [BarSchema] }),
			Bar: BarSchema,
		});

		expect(normalizrs).toHaveProperty('foos.schema.bar', normalizrs.bars);
		expect(normalizrs).toHaveProperty('foos.schema.bars', [normalizrs.bars]);
		expect(normalizrs).toHaveProperty('bars.schema', {});
	});

	it('Virtual', () => {
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

		expect(normalizrs).toHaveProperty('foos.schema', { bar: normalizrs.bars });
		expect(normalizrs).toHaveProperty('bars.schema.foos', [normalizrs.foos]);
		expect(Object.keys(normalizrs.bars.schema)).toEqual(['foos']);
	});

	it('Discriminator', () => {
		const normalizrs = mongooseNormalizr({
			Foo:          { discriminate: true, schema: Schema({ key: { type: String } }) },
			SpecialFoo:   Schema({ key2: { type: String } }),
			FooContainer: Schema({ foo: { ref: 'Foo', type: Schema.Types.ObjectId } }),

			Bar:          Schema({ key: { type: String } }, { discriminatorKey: 'kind' }),
			SpecialBar:   Schema({ key2: { type: String } }),
			BarContainer: Schema({ bar: { ref: 'Bar', type: Schema.Types.ObjectId } }),

			Other:          { discriminate: false, schema: Schema({ key: { type: String } }, { discriminatorKey: 'kind' }) },
			SpecialOther:   Schema({ key2: { type: String } }),
			OtherContainer: Schema({ other: { ref: 'Other', type: Schema.Types.ObjectId } }),

			Another:          { enable: false, schema: Schema({ key: { type: String } }, { discriminatorKey: 'category' }) },
			SpecialAnother:   Schema({ key2: { type: String } }),
			AnotherContainer: Schema({ another: { ref: 'Another', type: Schema.Types.ObjectId } }),
		});

		const expectedUnionDefinition = {
			Foo:          normalizrs.foos,
			SpecialFoo:   normalizrs.specialfoos,
			FooContainer: normalizrs.foocontainers,

			Bar:          normalizrs.bars,
			SpecialBar:   normalizrs.specialbars,
			BarContainer: normalizrs.barcontainers,

			Other:          normalizrs.others,
			SpecialOther:   normalizrs.specialothers,
			OtherContainer: normalizrs.othercontainers,

			// Another:          normalizrs.anothers,
			SpecialAnother:   normalizrs.specialanothers,
			AnotherContainer: normalizrs.anothercontainers,
		};

		expect(normalizrs.foocontainers.schema.foo).toBeInstanceOf(schema.Union);
		expect(normalizrs.foos).toBeInstanceOf(schema.Entity);
		expect(normalizrs).toHaveProperty('foocontainers.schema.foo.schema', expectedUnionDefinition);
		// assert.pass('TODO Test if the schemaAttribute function uses `__t`');
		expect(normalizrs.barcontainers.schema.bar).toBeInstanceOf(schema.Union);
		expect(normalizrs).toHaveProperty('barcontainers.schema.bar.schema', expectedUnionDefinition);
		// assert.pass('TODO Test if the schemaAttribute function uses `kind`');
		expect(normalizrs.othercontainers.schema.other).toBeInstanceOf(schema.Entity);
		expect(normalizrs).toHaveProperty('anothercontainers.schema', {});
	});
});
