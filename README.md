# mongoose-normalizr

Define [normalizr](https://www.npmjs.com/package/normalizr) entities from [mongoose](https://www.npmjs.com/package/mongoose) schemas!

[![npm](https://img.shields.io/npm/v/mongoose-normalizr.svg)](https://www.npmjs.com/package/mongoose-normalizr)
[![Travis](https://img.shields.io/travis/saiichihashimoto/mongoose-normalizr/master.svg)](https://travis-ci.org/saiichihashimoto/mongoose-normalizr)
[![Codecov](https://img.shields.io/codecov/c/github/saiichihashimoto/mongoose-normalizr/master.svg)](https://codecov.io/gh/saiichihashimoto/mongoose-normalizr)
[![Gitter](https://badges.gitter.im/mongoose-normalizr/Lobby.svg)](https://gitter.im/mongoose-normalizr/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge)
[![Greenkeeper badge](https://badges.greenkeeper.io/saiichihashimoto/mongoose-normalizr.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

You use [mongoose](https://www.npmjs.com/package/mongoose) to model your API's backend mongodb data.

You use [normalizr](https://www.npmjs.com/package/normalizr) to normalize you API data on the frontend.

normalizr entities represent nested data... but so do mongoose schemas! You're don't want to [repeat yourself](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself). You want to generate normalizr entities directly from your mongoose schemas.

Here you go!

## Features

- Define normalizr entities from mongoose schemas!
- Built specifically for the browser! *Works server-side, as well.*
- Traverses arrays and objects to find deep references.
- Supports [Sub Docs](http://mongoosejs.com/docs/subdocs.html).
- Supports [Populateable Virtuals](http://mongoosejs.com/docs/populate.html#populate-virtuals).
- Supports [Discriminators](http://mongoosejs.com/docs/discriminators.html).
- ~~Supports [Dynamic References (refPath)](http://mongoosejs.com/docs/populate.html#dynamic-ref)~~ [*soon*](https://github.com/saiichihashimoto/mongoose-normalizr/pull/15).

## Installation

```bash
npm install --save mongoose-normalizr
```

## Usage

```javascript
import mongoose from 'mongoose';
import mongooseNormalizr from 'mongoose-normalizr';
import { normalize } from 'normalizr';

const Foo = mongoose.Schema({ fi: { type: mongoose.Schema.Types.ObjectId, ref: 'Fi' } });
const Fi = mongoose.Schema({ foos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Foo' }] });

const normalizrs = mongooseNormalizr({
	Foo,
	Fi: { schema: Fi, collection: 'fiis' },
});

console.log('normalizrs:', normalizrs);

console.log('normalized:', normalize({ id: 'fi1', foos: [{ id: 'foo1' }, { id: 'foo2', fi: { id: 'fi2' } }] }, normalizrs.fiis));
```

#### Output

```
normalizrs: { foos:
   EntitySchema {
     ...
     schema: { fi: EntitySchema } },
  fiis:
   EntitySchema {
     ...
     schema: { foos: [EntitySchema] } } }


normalized: {
    "result": "fi1",
    "entities": {
        "foos": {
            "foo1": {
                "id": "foo1"
            },
            "foo2": {
                "id": "foo2",
                "fi": "fi2"
            }
        },
        "fiis": {
            "fi2": {
                "id": "fi2"
            },
            "fi1": {
                "id": "fi1",
                "foos": [
                    "foo1",
                    "foo2"
                ]
            }
        }
    }
}
```

## API

### ```mongooseNormalizr(schemas)```

Returns an object mapping collection names to normalizr entities.

#### Arguments

- ```schemas```: **required**: An object mapping mongoose model names (**not** collection names) to mongoose schemas. Instead of a mongoose schema, an object with the following properties may be supplied:
  - ```schema```: **required** The mongoose schema to use.
  - ```collection```: A collection name to use for the normalizr entities. Defaults to [`pluralize(modelName)`](https://github.com/vkarpov15/mongoose-legacy-pluralize).
  - ```enable```: Shorthand for `define`, `reference`, & `discriminate` (partially). Defaults to `true`.
  - ```define```: If `false`, produces an empty normalizr entity and doesn't follow any references. Defaults to value of `enable`.
  - ```reference```: If `false`, other produced entities will ignore references to this entity. Defaults to value of `enable`.
  - ```discriminate```: If `true`, references to the schema will produce normalizr [Unions](https://github.com/paularmstrong/normalizr/blob/master/docs/api.md#uniondefinition-schemaattribute) using `discriminatorKey || '\_\_t'`. *Unions don't [normalize to just an id](https://github.com/paularmstrong/normalizr/blob/master/docs/api.md#usage-5) like Entities do.* Defaults to `true` if `enable` and the schema was explicitly given a `discriminatorKey`.

See [our tests](https://github.com/saiichihashimoto/mongoose-normalizr/blob/master/src/index.spec.js) for examples!
