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

normalizr entities represent nested data... but so do mongoose schemas! You're don't want to [repeat yourself](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) and want to generate your normalizr entities directly from the mongoose schemas.

Cool!

## Installation

```bash
npm install --save mongoose-normalizr
```

## Usage

```javascript
import mongoose from 'mongoose';
import mongooseNormalizr from 'mongoose-normalizr';

const Foo = mongoose.Schema({ fi: { type: mongoose.Schema.Types.ObjectId, ref: 'Fi' } });
const Fi = mongoose.Schema({ foos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Foo' }] });

const normalizrs = mongooseNormalizr({
	Foo,
	Fi: { schema: Fi, collection: 'fiis' },
});

console.log(normalizrs);
```

#### Output

```
{ foos:
   EntitySchema {
     ...
     schema: { fi: EntitySchema } },
  fiis:
   EntitySchema {
     ...
     schema: { foos: [EntitySchema] } } }
```

## API

### ```mongooseNormalizr(schemas)```

Outputs an object mapping collection names to normalizr entities.

#### Arguments

- ```schemas``` *(Object)*: **required** An object whose keys are mongoose model names (**not** collection names) and values are mongoose schemas. An object can be supplied as well, with properties:
  - ```schema``` *(mongoose.Schema)*: **required** An object mapping mongoose model names to normalizr entity key names. This allows the resulting entities to map to each other properly.
  - ```collection``` *(String)*: A collection name to use for the normalizr entities. The default uses [`mongoose-legacy-pluralize`](https://github.com/vkarpov15/mongoose-legacy-pluralize/blob/master/index.js), which basically lowercases and pluralizes the model name.


## Caveats

- Doesn't respect [dynamic references (refPath)](http://mongoosejs.com/docs/populate.html#dynamic-ref). It's [on it's way](https://github.com/saiichihashimoto/mongoose-normalizr/pull/15)
- Can't respect [discriminators](http://mongoosejs.com/docs/discriminators.html#the-model-discriminator-function), due to them working on mongoose Models, not Schemas. An [issue](https://github.com/Automattic/mongoose/issues/6002) is open with mongoose to fix this.
