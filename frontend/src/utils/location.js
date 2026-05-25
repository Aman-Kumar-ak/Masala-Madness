export const DEFAULT_LOCATION_NAME = 'Keshavpuram';

export const getLocationId = (locationLike) => {
  if (!locationLike) return '';
  if (typeof locationLike === 'string') return locationLike;
  return locationLike._id || locationLike.id || locationLike.locationId || '';
};

export const getLocationName = (locationLike, fallback = 'Unassigned') => {
  if (!locationLike) return fallback;
  if (typeof locationLike === 'string') return locationLike;
  return locationLike.name || locationLike.locationName || fallback;
};

export const normalizeLocation = (locationLike) => {
  if (!locationLike) return null;
  return {
    ...locationLike,
    _id: getLocationId(locationLike),
    name: getLocationName(locationLike, DEFAULT_LOCATION_NAME)
  };
};

export const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query.set(key, String(value));
  });

  return query.toString();
};

export const appendQueryParams = (endpoint, params = {}) => {
  const queryString = buildQueryString(params);
  if (!queryString) {
    return endpoint;
  }

  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}`;
};
