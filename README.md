# mongoose-normalizr

Define [normalizr](https://www.npmjs.com/package/normalizr) entities from [mongoose](https://www.npmjs.com/package/mongoose) schemas!

[![npm](https://img.shields.io/npm/v/mongoose-normalizr.svg?style=for-the-badge)](https://www.npmjs.com/package/mongoose-normalizr)
[![Travis](https://img.shields.io/travis/saiichihashimoto/mongoose-normalizr.svg?style=for-the-badge)](https://travis-ci.org/saiichihashimoto/mongoose-normalizr)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=for-the-badge)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=for-the-badge)](http://commitizen.github.io/cz-cli/)

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

const FooSchema = mongoose.Schema({ fi: { type: mongoose.Schema.Types.ObjectId, ref: 'Fi' } });
const FiSchema = mongoose.Schema({ foos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Foo' }] });

const normalizrs = mongooseNormalizr({ Foo: FooSchema, Fi: FiSchema }, { Foo: 'foos', Fi: 'fis' });
console.log(normalizrs);
```

### Output

```
{ foos:
   EntitySchema {
     _key: 'foos',
     _getId: [Function],
     _idAttribute: 'id',
     _mergeStrategy: [Function],
     _processStrategy: [Function],
     schema: { fi: [EntitySchema] } },
  fis:
   EntitySchema {
     _key: 'fis',
     _getId: [Function],
     _idAttribute: 'id',
     _mergeStrategy: [Function],
     _processStrategy: [Function],
     schema: { foos: [Array] } } }
```

## API

### ```mongooseNormalizr(mongooseSchemas, normalizrEntityKeys)```

Outputs an object mapping normalizr entity key names to the entities.

### Arguments

- ```mongooseSchemas``` *(Object)*: An object mapping mongoose model names to mongoose schemas. The keys are not the normalizr entity key names, due to mongoose using [model names in ```ref``` fields](http://mongoosejs.com/docs/api.html#query_Query-populate).
- ```normalizrEntityKeys``` *(Object)*: An object mapping mongoose model names to normalizr entity key names. This allows the resulting entities to map to each other properly.

## Mongoose Models (non)support

Mongoose schemas are [now isomporphic and can be used in the browser](http://mongoosejs.com/docs/browser.html) while mongoose models exist in the context of a server. normalizr exists primarily for browser use cases and, besides model names, nothing on the model is necessary to generate the normalizr entities.
