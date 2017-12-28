import mongoose from 'mongoose';
import findNormalizrs from './findNormalizrs';

export default findNormalizrs(mongoose.utils.toCollectionName);
