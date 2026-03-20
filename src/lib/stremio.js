const DEFAULT_RPDB_API_URL = 'https://api.ratingposterdb.com';
const DEFAULT_OPENPOSTERDB_API_URL = 'https://openposterdb.com';

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

function decodeConfigJson(value) {
  const decodedValue = decodeConfigValue(value);

  if (!decodedValue) {
    return null;
  }

  try {
    return JSON.parse(decodedValue);
  } catch {
    return null;
  }
}

function normalizeUrl(value, fallbackValue) {
  const url = String(value || '').trim();
  return (url || fallbackValue).replace(/\/+$/, '');
}

function normalizeOpenPosterSuffixes(value) {
  const suffixes = String(value || '').trim();

  if (!suffixes) {
    return '';
  }

  return suffixes.startsWith('@') || suffixes.startsWith('.')
    ? suffixes
    : `.${suffixes}`;
}

function getPosterSourceConfig(rpdbApiUrl, posterSettings) {
  const source = posterSettings?.source || (rpdbApiUrl ? 'custom' : 'rpdb');

  return {
    source,
    rpdbApiUrl: normalizeUrl(rpdbApiUrl, DEFAULT_RPDB_API_URL),
    openPosterDbUrl: normalizeUrl(
      posterSettings?.openPosterDbUrl,
      DEFAULT_OPENPOSTERDB_API_URL
    ),
    openPosterDbSuffixes: normalizeOpenPosterSuffixes(
      posterSettings?.openPosterDbSuffixes
    ),
  };
}

function buildRpdbPosterUrl(metaId, rpdbKey, rpdbApiUrl) {
  if (!rpdbKey) {
    return null;
  }

  return `${normalizeUrl(rpdbApiUrl, DEFAULT_RPDB_API_URL)}/${rpdbKey}/imdb/poster-default/${metaId}.jpg`;
}

function buildOpenPosterDbPosterUrl(metaId, openPosterDbUrl, openPosterDbSuffixes) {
  return `${normalizeUrl(openPosterDbUrl, DEFAULT_OPENPOSTERDB_API_URL)}/imdb/${metaId}${normalizeOpenPosterSuffixes(openPosterDbSuffixes)}`;
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
    posterSettingsEncoded,
  ] = configParts;

  if (String(rpdbKey || '').startsWith('16')) {
    installedAt = rpdbKey;
    rpdbKey = null;
  }

  const rpdbApiUrl = decodeConfigValue(rpdbApiUrlEncoded);
  const posterSettings = decodeConfigJson(posterSettingsEncoded);

  return {
    selectedProviders,
    rpdbKey,
    countryCode,
    installedAt,
    netflixTop10Global,
    netflixTop10Country,
    netflixTop10CountryCode,
    rpdbApiUrl,
    posterSettings,
    posterSourceConfig: getPosterSourceConfig(rpdbApiUrl, posterSettings),
  };
}

export function replacePosterUrls(configuration, metas) {
  const {
    rpdbKey,
    posterSourceConfig,
  } = configuration;

  const shouldReplacePosters = posterSourceConfig.source === 'openposterdb' || rpdbKey;

  if (!shouldReplacePosters) {
    return metas;
  }

  return metas.map(meta => {
    let posterUrl = null;

    if (posterSourceConfig.source === 'openposterdb') {
      posterUrl = buildOpenPosterDbPosterUrl(
        meta.id,
        posterSourceConfig.openPosterDbUrl,
        posterSourceConfig.openPosterDbSuffixes
      );
    } else {
      posterUrl = buildRpdbPosterUrl(meta.id, rpdbKey, posterSourceConfig.rpdbApiUrl);
    }

    if (!posterUrl) {
      return meta;
    }

    return {
      ...meta,
      poster: posterUrl,
    };
  });
}
