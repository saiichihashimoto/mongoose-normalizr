import mongoose from 'mongoose';
import semver from 'semver';
import { schema as normalizr } from 'normalizr';
import { version as normalizrVersion } from 'normalizr/package';
import mongooseNormalizr from '.';

const normalizrIs1 = semver.satisfies(normalizrVersion, '>=1.0.0');
const normalizrIs2 = semver.satisfies(normalizrVersion, '>=2.0.0');
const normalizrIs3 = semver.satisfies(normalizrVersion, '>=3.0.0');
let normalizrEntity;
let normalizrUnion;

if (normalizrIs3) {
	normalizrEntity = normalizr.Entity;
	normalizrUnion = normalizr.Union;
} else if (normalizrIs1) {
	normalizrEntity = require('normalizr/lib/EntitySchema').default || require('normalizr/lib/EntitySchema'); // eslint-disable-line global-require, import/no-unresolved
	normalizrUnion = require('normalizr/lib/UnionSchema').default || require('normalizr/lib/UnionSchema'); // eslint-disable-line global-require, import/no-unresolved
} else {
	normalizrEntity = require('normalizr/EntitySchema'); // eslint-disable-line global-require, import/no-unresolved
}

describe('mongoose-normalizr', () => {
	const dotSchema = normalizrIs3 ? '.schema' : '';
	const dotSchemaUnion = normalizrIs3 ? '.schema' : '._itemSchema';

	it('returns an object of normalizr schemas', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({}),
		});

		expect(normalizrs).toHaveProperty('foos', expect.any(normalizrEntity));
	});

	it('uses provided collection name for key', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { collection: 'foo', schema: mongoose.Schema({}) },
		});

		expect(normalizrs).toHaveProperty('foo', expect.any(normalizrEntity));
	});

	it('references schemas using `ref`', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
			Bar: mongoose.Schema({}),
		});

		expect(normalizrs).toHaveProperty(`foos${dotSchema}.bar`, normalizrs.bars);
	});

	it('ignores `ref` of unspecified models', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
		});

		expect(normalizrs).not.toHaveProperty(`foos${dotSchema}.bar`);
	});

	it('references schemas using subdocuments', () => {
		const BarSchema = mongoose.Schema({});

		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: BarSchema }),
			Bar: BarSchema,
		});

		expect(normalizrs).toHaveProperty(`foos${dotSchema}.bar`, normalizrs.bars);
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

		expect(normalizrs).toHaveProperty(`foos${dotSchema}.bar`, [normalizrs.bars]);
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

		expect(normalizrs).toHaveProperty(`foos${dotSchema}.bar`, normalizrs.bars);
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

		expect(normalizrs).not.toHaveProperty(`foos${dotSchema}.bar`);
	});

	it('traverses into objects', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ child: { grandchild: { bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } } } }),
			Bar: mongoose.Schema({}),
		});

		expect(normalizrs).toHaveProperty(`foos${dotSchema}.child.grandchild.bar`, normalizrs.bars);
	});

	it('traverses into arrays', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bars: [{ ref: 'Bar', type: mongoose.Schema.Types.ObjectId }] }),
			Bar: mongoose.Schema({}),
		});

		expect(normalizrs).toHaveProperty(`foos${dotSchema}.bars`, [normalizrs.bars]);
	});

	it('ignores references if define=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { define: false, schema: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }) },
			Bar: mongoose.Schema({}),
		});

		expect(normalizrs).not.toHaveProperty(`foos${dotSchema}.bar`);
	});

	it('ignores references if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { enable: false, schema: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }) },
			Bar: mongoose.Schema({}),
		});

		expect(normalizrs).not.toHaveProperty(`foos${dotSchema}.bar`);
	});

	it('won\'t be referenced if reference=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { reference: false, schema: mongoose.Schema({}) },
			Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
		});

		expect(normalizrs).not.toHaveProperty(`bars${dotSchema}.foo`);
	});

	it('won\'t be referenced if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { reference: false, schema: mongoose.Schema({}) },
			Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
		});

		expect(normalizrs).not.toHaveProperty(`bars${dotSchema}.foo`);
	});

	// normalizr 1 doesn't have unions
	if (normalizrIs2) {
		it('uses unions if discriminate=true', () => {
			const normalizrs = mongooseNormalizr({
				Foo: { discriminate: true, schema: mongoose.Schema({}) },
				Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
			});

			expect(normalizrs).toHaveProperty(`bars${dotSchema}.foo`, expect.any(normalizrUnion));
			if (normalizrIs3) {
			// mongoose discriminator keys are __t by default
			// normalizr uses _schemaAttribute internally to determine the schema
				expect(normalizrs.bars.schema.foo._schemaAttribute({ __t: 'discriminatorKey' })).toBe('discriminatorKey'); // eslint-disable-line no-underscore-dangle
			} else {
				expect(normalizrs.bars.foo.getSchemaKey({ __t: 'discriminatorKey' })).toBe('discriminatorKey');
			}
			// the union's schema needs to key schemas by model name to get the correct schema
			expect(normalizrs).toHaveProperty(`bars${dotSchema}.foo${dotSchemaUnion}.Foo`, normalizrs.foos);
			expect(normalizrs).toHaveProperty(`bars${dotSchema}.foo${dotSchemaUnion}.Bar`, normalizrs.bars);
		});

		it('uses unions if discriminatorKey', () => {
			const normalizrs = mongooseNormalizr({
				Foo: mongoose.Schema({}, { discriminatorKey: 'discriminatorKey' }),
				Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
			});

			expect(normalizrs).toHaveProperty(`bars${dotSchema}.foo`, expect.any(normalizrUnion));
			if (normalizrIs3) {
				expect(normalizrs.bars.schema.foo._schemaAttribute({ discriminatorKey: 'discriminatorKey' })).toBe('discriminatorKey'); // eslint-disable-line no-underscore-dangle
			} else {
				expect(normalizrs.bars.foo.getSchemaKey({ discriminatorKey: 'discriminatorKey' })).toBe('discriminatorKey');
			}
			expect(normalizrs).toHaveProperty(`bars${dotSchema}.foo${dotSchemaUnion}.Foo`, normalizrs.foos);
			expect(normalizrs).toHaveProperty(`bars${dotSchema}.foo${dotSchemaUnion}.Bar`, normalizrs.bars);
		});

		it('won\'t use a union if discriminate=false', () => {
			const normalizrs = mongooseNormalizr({
				Foo: { discriminate: false, schema: mongoose.Schema({}, { discriminatorKey: 'discriminatorKey' }) },
				Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
			});

			expect(normalizrs).not.toHaveProperty(`bars${dotSchema}.foo`, expect.any(normalizrUnion));
		});

		it('won\'t use a union if enable=false', () => {
			const normalizrs = mongooseNormalizr({
				Foo: { enable: false, schema: mongoose.Schema({}, { discriminatorKey: 'discriminatorKey' }) },
				Bar: mongoose.Schema({ foo: { ref: 'Foo', type: mongoose.Schema.Types.ObjectId } }),
			});

			expect(normalizrs).not.toHaveProperty(`bars${dotSchema}.foo`, expect.any(normalizrUnion));
		});
	}
});
