[![current version](https://img.shields.io/npm/v/mongoose-normalizr.svg)](https://www.npmjs.com/package/mongoose-normalizr)
[![Build Status](https://travis-ci.org/saiichihashimoto/mongoose-normalizr.svg?branch=master)](https://travis-ci.org/saiichihashimoto/mongoose-normalizr)
[![codecov](https://codecov.io/gh/saiichihashimoto/mongoose-normalizr/branch/master/graph/badge.svg)](https://codecov.io/gh/saiichihashimoto/mongoose-normalizr)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Greenkeeper badge](https://badges.greenkeeper.io/saiichihashimoto/mongoose-normalizr.svg)](https://greenkeeper.io/)

Generate [normalizr](https://www.npmjs.com/package/normalizr) schemas from [mongoose](https://www.npmjs.com/package/mongoose) schemas!

normalizr and mongoose both define relationships between the same objects. Define the mongoose relationships and get the same normalizr relationships without repeating yourself.

# Installation

```bash
npm install --save mongoose-normalizr
```

# Usage

```javascript
import mongoose from 'mongoose';
import normalizr from 'normalizr';
import mongooseNormalizr from 'mongoose-normalizr';

const Foo = mongoose.Schema({
	bar: { ref: 'Bar', type: mongoose.Schema.Types.ObjectId },
});
const Bar = mongoose.Schema({
	foos: [{ ref: 'Foo', type: mongoose.Schema.Types.ObjectId }],
});

const normalizrs = mongooseNormalizr({
	Foo,
	Bar,
});

const denormalizedFoo = {
	id:  'foo1',
	bar: {
		id:   'bar1',
		foos: [
			{
				id: 'foo2',
			},
			{
				id:  'foo3',
				bar: {
					id: 'bar2',
				},
			},
		],
	},
};

console.log('normalized:', normalizr.normalize(denormalizedFoo, normalizrs.foos));
```

```json
{
  "result": "foo1",
  "entities": {
    "foos": {
      "foo1": {
        "id": "foo1",
        "bar": "bar1"
      },
      "foo2": {
        "id": "foo2"
      },
      "foo3": {
        "id": "foo3",
        "bar": "bar2"
      }
    },
    "bars": {
      "bar1": {
        "id": "bar1",
        "foos": [
          "foo2",
          "foo3"
        ]
      },
      "bar2": {
        "id": "bar2"
      }
    }
  }
}
```

# Features

- Built specifically for the browser! *Works server-side, as well.*
- Traverses arrays and objects to find deep references.
- Supports [Subdocuments](http://mongoosejs.com/docs/subdocs.html).
- Supports [Populateable Virtuals](http://mongoosejs.com/docs/populate.html#populate-virtuals).
- Supports [Discriminators](http://mongoosejs.com/docs/discriminators.html)
  - It does this by generating normalizr [Unions](https://github.com/paularmstrong/normalizr/blob/master/docs/api.md#uniondefinition-schemaattribute). *Unions don't [normalize to an id](https://github.com/paularmstrong/normalizr/blob/master/docs/api.md#usage-5) like Entities do.*
- Works on *all* versions of normalizr, all the way back to `0.1.1`.

# ```mongooseNormalizr(schemas)```

- ```schemas```: **required**: An object mapping mongoose model names (**not** collection names) to mongoose schemas. Instead of a mongoose schema, you may supply an object with the following properties:
	- ```schema```: **required** The mongoose schema to use.
	- ```collection```: A collection name to use for the normalizr schemas Defaults to [`pluralize(modelName)`](https://github.com/vkarpov15/mongoose-legacy-pluralize).
	- ```define```: If `false`, produces an empty normalizr schema and doesn't follow any references. Defaults to value of `enable`.
	- ```reference```: If `false`, other produced schemas will ignore references to this schema Defaults to value of `enable`.
	- ```enable```: Shorthand for `define` && `reference`. Defaults to `true`.

See [our tests](https://github.com/saiichihashimoto/mongoose-normalizr/blob/master/src/index.spec.js) for examples!
