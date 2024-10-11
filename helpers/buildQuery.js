export const buildQuery = (fields) => {
    const query = { $set: {}, $unset: {} };
  
    if (fields.$set) {
      for (const key in fields.$set) {
        if (typeof fields.$set[key] === 'object' && !Array.isArray(fields.$set[key])) {
          for (const subKey in fields.$set[key]) {
            query.$set[`${key}.${subKey}`] = fields.$set[key][subKey];
          }
        } else {
          query.$set[key] = fields.$set[key];
        }
      }
    }
  
    if (fields.$unset) {
      for (const key in fields.$unset) {
        query.$unset[key] = fields.$unset[key];
      }
    }
  
    return query;
  };