import mongoose from 'mongoose';
import semver from 'semver';
import { normalize } from 'normalizr';
import { version as mongooseVersion } from 'mongoose/package';
import { version as normalizrVersion } from 'normalizr/package';
import mongooseNormalizr from '.';

describe('mongoose-normalizr', () => {
	it('returns an object of normalizr schemas', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({}),
		});

		const normalized = normalize({ id: 1 }, normalizrs.foos);

		expect(normalized).toHaveProperty('result', 1);
		expect(normalized).toHaveProperty('entities.foos.1.id', 1);
	});

	it('uses provided collection name for key', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { collection: 'foo', schema: mongoose.Schema({}) },
		});

		const normalized = normalize({ id: 1 }, normalizrs.foo);

		expect(normalized).toHaveProperty('result', 1);
		expect(normalized).toHaveProperty('entities.foo.1.id', 1);
	});

	it('references schemas', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
			Bar: mongoose.Schema({}),
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toHaveProperty('entities.foos.1.bar', 2);
		expect(normalized).toHaveProperty('entities.bars.2.id', 2);
	});

	it('ignores unspecified schemas', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toHaveProperty('entities.foos.1.bar', { id: 2 });
		expect(normalized).not.toHaveProperty('entities.bars.2');
	});

	it('traverses into objects', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ child: { grandchild: { bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } } } }),
			Bar: mongoose.Schema({}),
		});

		const normalized = normalize(
			{ id: 1, child: { grandchild: { bar: { id: 2 } } } },
			normalizrs.foos,
		);

		expect(normalized).toHaveProperty('entities.foos.1.child.grandchild.bar', 2);
		expect(normalized).toHaveProperty('entities.bars.2.id', 2);
	});

	it('traverses into arrays', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bars: [{ ref: 'Bar', type: mongoose.Schema.Types.ObjectId }] }),
			Bar: mongoose.Schema({}),
		});

		const normalized = normalize({ id: 1, bars: [{ id: 2 }] }, normalizrs.foos);

		expect(normalized).toHaveProperty('entities.foos.1.bars', semver.satisfies(normalizrVersion, '>=3.0.0') ? [2] : { 0: 2 });
		expect(normalized).toHaveProperty('entities.bars.2.id', 2);
	});

	it('ignores references if define=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { define: false, schema: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }) },
			Bar: mongoose.Schema({}),
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toHaveProperty('entities.foos.1.bar', { id: 2 });
		expect(normalized).not.toHaveProperty('entities.bars.2');
	});

	it('ignores references if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { enable: false, schema: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }) },
			Bar: mongoose.Schema({}),
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toHaveProperty('entities.foos.1.bar', { id: 2 });
		expect(normalized).not.toHaveProperty('entities.bars.2');
	});

	it('won\'t be referenced if reference=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
			Bar: { reference: false, schema: mongoose.Schema({}) },
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toHaveProperty('entities.foos.1.bar', { id: 2 });
		expect(normalized).not.toHaveProperty('entities.bars.2');
	});

	it('won\'t be referenced if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
			Bar: { enable: false, schema: mongoose.Schema({}) },
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toHaveProperty('entities.foos.1.bar', { id: 2 });
		expect(normalized).not.toHaveProperty('entities.bars.2');
	});

	describe('subdocuments', () => {
		it('references schemas', () => {
			const BarSchema = mongoose.Schema({});

			const normalizrs = mongooseNormalizr({
				Foo: mongoose.Schema({ bar: BarSchema }),
				Bar: BarSchema,
			});

			const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

			expect(normalized).toHaveProperty('entities.foos.1.bar', 2);
			expect(normalized).toHaveProperty('entities.bars.2.id', 2);
		});

		it('ignores unspecified schemas', () => {
			const BarSchema = mongoose.Schema({});

			const normalizrs = mongooseNormalizr({
				Foo: mongoose.Schema({ bar: BarSchema }),
			});

			const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

			expect(normalized).toHaveProperty('entities.foos.1.bar', { id: 2 });
			expect(normalized).not.toHaveProperty('entities.bars.2');
		});
	});

	describe('populate virtuals', () => {
		it('references schemas', () => {
			const schemas = {
				Foo: mongoose.Schema({ barId: { type: String } }),
				Bar: mongoose.Schema({ fooId: { type: String } }),
			};

			schemas.Foo.virtual('bars', {
				ref:          'Bar',
				localField:   'barId',
				foreignField: 'fooId',
			});

			const normalizrs = mongooseNormalizr(schemas);

			const normalized = normalize({ id: 1, bars: [{ id: 2 }] }, normalizrs.foos);

			expect(normalized).toHaveProperty('entities.foos.1.bars', semver.satisfies(normalizrVersion, '>=3.0.0') ? [2] : { 0: 2 });
			expect(normalized).toHaveProperty('entities.bars.2.id', 2);
		});

		it('respects justOne', () => {
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

			const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

			expect(normalized).toHaveProperty('entities.foos.1.bar', 2);
			expect(normalized).toHaveProperty('entities.bars.2.id', 2);
		});

		it('ignores unspecified schemas', () => {
			const schemas = {
				Foo: mongoose.Schema({ barId: { type: String } }),
			};

			schemas.Foo.virtual('bar', {
				ref:          'Bar',
				localField:   'barId',
				foreignField: 'fooId',
			});

			const normalizrs = mongooseNormalizr(schemas);

			const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

			expect(normalized).toHaveProperty('entities.foos.1.bar', { id: 2 });
			expect(normalized).not.toHaveProperty('entities.bars.2');
		});
	});

	if (semver.satisfies(normalizrVersion, '>=2.0.0') && semver.satisfies(mongooseVersion, '>=5.0.2')) {
		describe('discriminators', () => {
			afterEach(() => {
				mongoose.connections[0].collections = {};
				mongoose.connections[0].models = {};
				mongoose.modelSchemas = {};
				mongoose.models = {};
			});

			it('generates unions', () => {
				const schemas = {
					Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
					Bar: mongoose.Schema({}),
					Baz: mongoose.Schema({}),
				};

				const BarModel = mongoose.model('Bar', schemas.Bar);
				BarModel.discriminator('Baz', schemas.Baz);

				const normalizrs = mongooseNormalizr(schemas);

				const normalized = normalize({ id: 1, bar: { id: 2, __t: 'Baz' } }, normalizrs.foos);

				expect(normalized).toHaveProperty('entities.foos.1.bar', { id: 2, schema: 'Baz' });
				expect(normalized).toHaveProperty('entities.bazs.2', { id: 2, __t: 'Baz' });
			});

			it('uses discriminatorKey', () => {
				const schemas = {
					Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
					Bar: mongoose.Schema({}, { discriminatorKey: 'type' }),
					Baz: mongoose.Schema({}),
				};

				const BarModel = mongoose.model('Bar', schemas.Bar);
				BarModel.discriminator('Baz', schemas.Baz);

				const normalizrs = mongooseNormalizr(schemas);

				const normalized = normalize({ id: 1, bar: { id: 2, type: 'Baz' } }, normalizrs.foos);

				expect(normalized).toHaveProperty('entities.bazs.2', { id: 2, type: 'Baz' });
			});

			it('is disabled with enable=false', () => {
				const schemas = {
					Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
					Bar: { enable: false, schema: mongoose.Schema({}) },
					Baz: mongoose.Schema({}),
				};

				const BarModel = mongoose.model('Bar', schemas.Bar.schema);
				BarModel.discriminator('Baz', schemas.Baz);

				const normalizrs = mongooseNormalizr(schemas);

				const normalized = normalize({ id: 1, bar: { id: 2, __t: 'Baz' } }, normalizrs.foos);

				expect(normalized).not.toHaveProperty('entities.bazs.2');
			});
		});
	}
});
