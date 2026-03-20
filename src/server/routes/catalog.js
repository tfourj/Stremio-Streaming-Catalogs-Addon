import { getNetflixTop10Catalog, getNetflixTop10Global } from '../../services/netflix/resolver.js';
import { parseAddonConfiguration, replacePosterUrls } from '../../lib/stremio.js';

/**
 * Catalog route handler
 */
export function handleCatalog(req, res, movies, series, mixpanel) {
  res.setHeader('Cache-Control', 'max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public');
  res.setHeader('content-type', 'application/json');

  // Parse config
  const configuration = parseAddonConfiguration(req.params?.configuration);
  const {
    selectedProviders,
    rpdbKey,
    countryCode,
    installedAt,
  } = configuration;

  mixpanel && mixpanel.track('catalog', {
    ip: req.ip,
    distinct_id: req.ip.replace(/\.|:/g, 'Z'),
    configuration: req.params?.configuration,
    selectedProviders,
    rpdbKey,
    countryCode,
    installedAt,
    catalog_type: req.params.type,
    catalog_id: req.params.id,
    catalog_extra: req.params?.extra,
  });

  let id = req.params.id;
  
  // Legacy addon, netflix-only catalog support
  if (id === 'top') {
    id = 'nfx';
  }
  
  // Jio and Hotstar merged - fallback hst to jhs
  if (id === 'hst') {
    id = 'jhs';
  }

  // Handle Netflix Top 10 catalogs
  if (id.startsWith('netflix-top10-')) {
    const isGlobal = id === 'netflix-top10-global';
    const countryCode = isGlobal ? null : id.replace('netflix-top10-', '');
    const type = req.params.type === 'movie' ? 'movies' : 'shows';

    console.log(`Netflix Top 10 request: id=${id}, isGlobal=${isGlobal}, countryCode=${countryCode}, type=${type}`);

    // Use async handler
    (async () => {
      try {
        let metas;
        if (isGlobal) {
          console.log(`Fetching global Netflix Top 10 (${type})`);
          metas = await getNetflixTop10Global(type);
        } else {
          console.log(`Fetching Netflix Top 10 for country ${countryCode} (${type})`);
          metas = await getNetflixTop10Catalog(countryCode, type);
        }
        console.log(`Returning ${metas.length} metas for ${id}`);
        res.send({ metas: replacePosterUrls(configuration, metas) });
      } catch (error) {
        console.error(`Error fetching Netflix Top 10 catalog ${id}:`, error.message);
        if (error.stack) {
          console.error(error.stack);
        }
        // Make sure response hasn't been sent yet
        if (!res.headersSent) {
          res.send({ metas: [] });
        }
      }
    })().catch((error) => {
      console.error(`Unhandled error in Netflix Top 10 catalog ${id}:`, error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      if (!res.headersSent) {
        res.send({ metas: [] });
      }
    });
    return;
  }

  // Handle regular provider catalogs
  if (req.params.type === 'movie') {
    res.send({ metas: replacePosterUrls(configuration, movies[id] || []) });
    return;
  }

  if (req.params.type === 'series') {
    res.send({ metas: replacePosterUrls(configuration, series[id] || []) });
    return;
  }
}

