const DEFAULT_RPDB_API_URL = 'https://api.ratingposterdb.com';
const DEFAULT_OPENPOSTERDB_API_URL = 'https://openposterdb.com';
const DEFAULT_OPENPOSTERDB_API_KEY = 't0-free-rpdb';

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

function normalizeOpenPosterArguments(value) {
  const argumentsValue = String(value || '').trim();

  if (!argumentsValue) {
    return '';
  }

  return argumentsValue;
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
    openPosterDbApiKey: String(
      posterSettings?.openPosterDbApiKey || DEFAULT_OPENPOSTERDB_API_KEY
    ).trim() || DEFAULT_OPENPOSTERDB_API_KEY,
    openPosterDbArguments: normalizeOpenPosterArguments(
      posterSettings?.openPosterDbArguments || posterSettings?.openPosterDbSuffixes
    ),
  };
}

function buildRpdbPosterUrl(metaId, rpdbKey, rpdbApiUrl) {
  if (!rpdbKey) {
    return null;
  }

  return `${normalizeUrl(rpdbApiUrl, DEFAULT_RPDB_API_URL)}/${rpdbKey}/imdb/poster-default/${metaId}.jpg`;
}

function buildOpenPosterDbPosterUrl(metaId, openPosterDbUrl, openPosterDbApiKey, openPosterDbArguments) {
  return `${normalizeUrl(openPosterDbUrl, DEFAULT_OPENPOSTERDB_API_URL)}/${String(openPosterDbApiKey || DEFAULT_OPENPOSTERDB_API_KEY).trim() || DEFAULT_OPENPOSTERDB_API_KEY}/imdb/poster-default/${metaId}${normalizeOpenPosterArguments(openPosterDbArguments)}`;
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
        posterSourceConfig.openPosterDbApiKey,
        posterSourceConfig.openPosterDbArguments
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
