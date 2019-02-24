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

		expect(normalized).toEqual({
			result:   1,
			entities: {
				foos: {
					1: {
						id: 1,
					},
				},
			},
		});
	});

	it('uses schema options.collection for key', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({}, { collection: 'foo' }),
		});

		const normalized = normalize({ id: 1 }, normalizrs.foo);

		expect(normalized).toEqual({
			result:   1,
			entities: {
				foo: {
					1: {
						id: 1,
					},
				},
			},
		});
	});

	it('references schemas', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
			Bar: mongoose.Schema({}),
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toEqual({
			result:   1,
			entities: {
				foos: {
					1: {
						id:  1,
						bar: 2,
					},
				},
				bars: {
					2: {
						id: 2,
					},
				},
			},
		});
	});

	it('ignores unspecified schemas', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toHaveProperty('entities.foos.1.bar', { id: 2 });
		expect(normalized).not.toHaveProperty('entities.bars.2');
		expect(normalized).toEqual({
			result:   1,
			entities: {
				foos: {
					1: {
						id:  1,
						bar: {
							id: 2,
						},
					},
				},
			},
		});
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

		expect(normalized).toEqual({
			result:   1,
			entities: {
				foos: {
					1: {
						id:    1,
						child: {
							grandchild: {
								bar: 2,
							},
						},
					},
				},
				bars: {
					2: {
						id: 2,
					},
				},
			},
		});
	});

	it('traverses into arrays', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bars: [{ ref: 'Bar', type: mongoose.Schema.Types.ObjectId }] }),
			Bar: mongoose.Schema({}),
		});

		const normalized = normalize({ id: 1, bars: [{ id: 2 }] }, normalizrs.foos);

		expect(normalized).toEqual({
			result:   1,
			entities: {
				foos: {
					1: {
						id:   1,
						bars: semver.satisfies(normalizrVersion, '>=3.0.0') ? [2] : { 0: 2 },
					},
				},
				bars: {
					2: {
						id: 2,
					},
				},
			},
		});
	});

	it('ignores references if define=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { define: false, schema: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }) },
			Bar: mongoose.Schema({}),
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toEqual({
			result:   1,
			entities: {
				foos: {
					1: {
						id:  1,
						bar: {
							id: 2,
						},
					},
				},
			},
		});
	});

	it('ignores references if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: { enable: false, schema: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }) },
			Bar: mongoose.Schema({}),
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toEqual({
			result:   1,
			entities: {
				foos: {
					1: {
						id:  1,
						bar: {
							id: 2,
						},
					},
				},
			},
		});
	});

	it('won\'t be referenced if reference=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
			Bar: { reference: false, schema: mongoose.Schema({}) },
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toEqual({
			result:   1,
			entities: {
				foos: {
					1: {
						id:  1,
						bar: {
							id: 2,
						},
					},
				},
			},
		});
	});

	it('won\'t be referenced if enable=false', () => {
		const normalizrs = mongooseNormalizr({
			Foo: mongoose.Schema({ bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId } }),
			Bar: { enable: false, schema: mongoose.Schema({}) },
		});

		const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

		expect(normalized).toEqual({
			result:   1,
			entities: {
				foos: {
					1: {
						id:  1,
						bar: {
							id: 2,
						},
					},
				},
			},
		});
	});

	describe('Subdocuments', () => {
		it('references schemas', () => {
			const BarSchema = mongoose.Schema({});

			const normalizrs = mongooseNormalizr({
				Foo: mongoose.Schema({ bars: [BarSchema] }),
				Bar: BarSchema,
			});

			const normalized = normalize({ id: 1, bars: [{ id: 2 }] }, normalizrs.foos);

			expect(normalized).toEqual({
				result:   1,
				entities: {
					foos: {
						1: {
							id:   1,
							bars: semver.satisfies(normalizrVersion, '>=3.0.0') ? [2] : { 0: 2 },
						},
					},
					bars: {
						2: {
							id: 2,
						},
					},
				},
			});
		});

		it('ignores unspecified schemas', () => {
			const BarSchema = mongoose.Schema({});

			const normalizrs = mongooseNormalizr({
				Foo: mongoose.Schema({ bars: [BarSchema] }),
			});

			const normalized = normalize({ id: 1, bars: [{ id: 2 }] }, normalizrs.foos);

			expect(normalized).toEqual({
				result:   1,
				entities: {
					foos: {
						1: {
							id:   1,
							bars: [{ id: 2 }],
						},
					},
				},
			});
		});

		if (semver.satisfies(mongooseVersion, '>=4.2.0')) {
			// Single-nested schemas only available >= 4.2.0
			// https://github.com/Automattic/mongoose/blob/af4c62cd3c904947639663d2b1f3d59e5b1abcc8/docs/subdocs.jade#L31

			it('references single-nested schemas', () => {
				const BarSchema = mongoose.Schema({});

				const normalizrs = mongooseNormalizr({
					Foo: mongoose.Schema({ bar: BarSchema }),
					Bar: BarSchema,
				});

				const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

				expect(normalized).toEqual({
					result:   1,
					entities: {
						foos: {
							1: {
								id:  1,
								bar: 2,
							},
						},
						bars: {
							2: {
								id: 2,
							},
						},
					},
				});
			});

			it('ignores unspecified single-nested schemas', () => {
				const BarSchema = mongoose.Schema({});

				const normalizrs = mongooseNormalizr({
					Foo: mongoose.Schema({ bar: BarSchema }),
				});

				const normalized = normalize({ id: 1, bar: { id: 2 } }, normalizrs.foos);

				expect(normalized).toEqual({
					result:   1,
					entities: {
						foos: {
							1: {
								id:  1,
								bar: {
									id: 2,
								},
							},
						},
					},
				});
			});
		}
	});

	describe('Populate Virtuals', () => {
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

			expect(normalized).toEqual({
				result:   1,
				entities: {
					foos: {
						1: {
							id:   1,
							bars: semver.satisfies(normalizrVersion, '>=3.0.0') ? [2] : { 0: 2 },
						},
					},
					bars: {
						2: {
							id: 2,
						},
					},
				},
			});
		});

		it('references one schema if justOne=true', () => {
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

			expect(normalized).toEqual({
				result:   1,
				entities: {
					foos: {
						1: {
							id:  1,
							bar: 2,
						},
					},
					bars: {
						2: {
							id: 2,
						},
					},
				},
			});
		});

		it('ignores if count=true', () => {
			const schemas = {
				Foo: mongoose.Schema({ barId: { type: String } }),
				Bar: mongoose.Schema({ fooId: { type: String } }),
			};

			schemas.Foo.virtual('bars', {
				ref:          'Bar',
				localField:   'barId',
				foreignField: 'fooId',
				count:        true,
			});

			const normalizrs = mongooseNormalizr(schemas);

			const normalized = normalize({ id: 1, bars: [{ id: 2 }] }, normalizrs.foos);

			expect(normalized).toEqual({
				result:   1,
				entities: {
					foos: {
						1: {
							id:   1,
							bars: [{ id: 2 }],
						},
					},
				},
			});
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

			const normalized = normalize({ id: 1, bars: [{ id: 2 }] }, normalizrs.foos);

			expect(normalized).toEqual({
				result:   1,
				entities: {
					foos: {
						1: {
							id:   1,
							bars: [{ id: 2 }],
						},
					},
				},
			});
		});
	});

	describe('Dynamic References', () => {
		if (semver.satisfies(normalizrVersion, '>=3.0.0')) {
			it('generates unions', () => {
				const normalizrs = mongooseNormalizr({
					Foo: mongoose.Schema({
						bar:      { refPath: 'barModel', type: mongoose.Schema.Types.ObjectId },
						barModel: { type: String },
					}),
					Bar: mongoose.Schema({}),
				});

				const normalized = normalize({ id: 1, bar: { id: 2 }, barModel: 'Bar' }, normalizrs.foos);

				expect(normalized).toEqual({
					result:   1,
					entities: {
						foos: {
							1: {
								id:  1,
								bar: {
									id:     2,
									schema: 'Bar',
								},
								barModel: 'Bar',
							},
						},
						bars: {
							2: {
								id: 2,
							},
						},
					},
				});
			});
		} else {
			it('doesn\'t generate unions', () => {
				const normalizrs = mongooseNormalizr({
					Foo: mongoose.Schema({
						bar:      { refPath: 'barModel', type: mongoose.Schema.Types.ObjectId },
						barModel: { type: String },
					}),
					Bar: mongoose.Schema({}),
				});

				const normalized = normalize({ id: 1, bar: { id: 2 }, barModel: 'Bar' }, normalizrs.foos);

				expect(normalized).toEqual({
					result:   1,
					entities: {
						foos: {
							1: {
								id:       1,
								bar:      { id: 2 },
								barModel: 'Bar',
							},
						},
					},
				});
			});
		}
	});

	if (semver.satisfies(mongooseVersion, '>=3.7.4')) {
		describe('Discriminators', () => {
			afterEach(() => {
				mongoose.connections[0].collections = {};
				mongoose.connections[0].models = {};
				mongoose.modelSchemas = {};
				mongoose.models = {};
			});

			if (semver.satisfies(mongooseVersion, '^4.13.10 || >=5.0.2') && semver.satisfies(normalizrVersion, '>=2.0.0')) {
				it('generates unions', () => {
					const schemas = {
						Foo: mongoose.Schema({}),
						Bar: mongoose.Schema({}),
					};

					const FooModel = mongoose.model('Foo', schemas.Foo);
					FooModel.discriminator('Bar', schemas.Bar);

					const normalizrs = mongooseNormalizr(schemas);

					const normalized = normalize({ id: 1, __t: 'Bar' }, normalizrs.foos);

					expect(normalized).toEqual({
						result:   { id: 1, schema: 'Bar' },
						entities: {
							bars: {
								1: {
									id:  1,
									__t: 'Bar',
								},
							},
						},
					});
				});

				it('uses discriminatorKey', () => {
					const schemas = {
						Foo: mongoose.Schema({}, { discriminatorKey: 'type' }),
						Bar: mongoose.Schema({}),
					};

					const FooModel = mongoose.model('Foo', schemas.Foo);
					FooModel.discriminator('Bar', schemas.Bar);

					const normalizrs = mongooseNormalizr(schemas);

					const normalized = normalize({ id: 1, type: 'Bar' }, normalizrs.foos);

					expect(normalized).toEqual({
						result:   { id: 1, schema: 'Bar' },
						entities: {
							bars: {
								1: {
									id:   1,
									type: 'Bar',
								},
							},
						},
					});
				});

				it('is disabled with enable=false', () => {
					const schemas = {
						Foo: { enable: false, schema: mongoose.Schema({}) },
						Bar: mongoose.Schema({}),
					};

					const FooModel = mongoose.model('Foo', schemas.Foo.schema);
					FooModel.discriminator('Bar', schemas.Bar);

					const normalizrs = mongooseNormalizr(schemas);

					const normalized = normalize({ id: 1, __t: 'Bar' }, normalizrs.foos);

					expect(normalized).toEqual({
						result:   1,
						entities: {
							foos: {
								1: {
									id:  1,
									__t: 'Bar',
								},
							},
						},
					});
				});
			} else {
				it('doesn\'t generate unions', () => {
					const schemas = {
						Foo: mongoose.Schema({}),
						Bar: mongoose.Schema({}),
					};

					const FooModel = mongoose.model('Foo', schemas.Foo);
					FooModel.discriminator('Bar', schemas.Bar);

					const normalizrs = mongooseNormalizr(schemas);

					const normalized = normalize({ id: 1, __t: 'Bar' }, normalizrs.foos);

					expect(normalized).toEqual({
						result:   1,
						entities: {
							foos: {
								1: {
									id:  1,
									__t: 'Bar',
								},
							},
						},
					});
				});
			}
		});
	}
});
