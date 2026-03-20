const DEFAULT_RPDB_API_URL = 'https://api.ratingposterdb.com';

function decodeConfigValue(value) {
  if (!value) {
    return '';
  }

  try {
    return Buffer.from(value, 'base64').toString('utf8').trim();
  } catch {
    return '';
  }
}

export function parseAddonConfiguration(configuration) {
  const buffer = Buffer.from(configuration || '', 'base64');
  const configParts = buffer.toString('ascii').split(':');
  let [
    selectedProviders,
    rpdbKey,
    countryCode,
    installedAt,
    netflixTop10Global,
    netflixTop10Country,
    netflixTop10CountryCode,
    rpdbApiUrlEncoded,
  ] = configParts;

  if (String(rpdbKey || '').startsWith('16')) {
    installedAt = rpdbKey;
    rpdbKey = null;
  }

  return {
    selectedProviders,
    rpdbKey,
    countryCode,
    installedAt,
    netflixTop10Global,
    netflixTop10Country,
    netflixTop10CountryCode,
    rpdbApiUrl: decodeConfigValue(rpdbApiUrlEncoded),
  };
}

function normalizeRpdbApiUrl(rpdbApiUrl) {
  const url = String(rpdbApiUrl || '').trim();
  return (url || DEFAULT_RPDB_API_URL).replace(/\/+$/, '');
}

/**
 * Replace posters with RPDB (Rating Poster DB) URLs if RPDB key is provided
 */
export function replaceRpdbPosters(rpdbKey, metas, rpdbApiUrl) {
  if (!rpdbKey) {
    return metas;
  }

  const baseUrl = normalizeRpdbApiUrl(rpdbApiUrl);

  return metas.map(meta => {
    return {
      ...meta,
      poster: `${baseUrl}/${rpdbKey}/imdb/poster-default/${meta.id}.jpg`
    };
  });
}
