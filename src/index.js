import utils from 'mongoose/lib/utils';
import findNormalizrs from './findNormalizrs';

export default findNormalizrs(utils.toCollectionName);
