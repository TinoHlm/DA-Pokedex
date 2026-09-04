const apiBaseUrl = "https://pokeapi.co/api/v2/pokemon";
const pageSize = 20;
const placeholderImage = "./assets/imgs/unknown-pokemon.png";
const searchLimit = 30;

let totalPages = 0;
let allPokemonNames = null;

const pageCache = new Map();
const pokemonCache = new Map();
const evolutionCache = new Map();

function getPageOffset(page) {
  return (page - 1) * pageSize;
}

function getPageUrl(page) {
  const offset = getPageOffset(page);
  return `${apiBaseUrl}?offset=${offset}&limit=${pageSize}`;
}

function checkResponse(response) {
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function fetchPokemonPage(page) {
  const pageUrl = getPageUrl(page);

  return fetch(pageUrl).then(checkResponse);
}

function fetchPokemonDetails(pokemon) {
  const pokemonDetailsUrl = pokemon.url;

  return fetch(pokemonDetailsUrl).then(checkResponse);
}

function fetchPageDetails(page) {
  return fetchPokemonPage(page).then((pageData) => {
    totalPages = Math.ceil(pageData.count / pageSize);
    const detailPromises = pageData.results.map((pokemon) =>
      fetchPokemonDetails(pokemon),
    );
    return Promise.all(detailPromises);
  });
}

function fetchAllPokemonNames() {
  if (allPokemonNames) return Promise.resolve(allPokemonNames);

  return fetch(`${apiBaseUrl}?limit=100000&offset=0`)
    .then(checkResponse)
    .then((pageData) => {
      allPokemonNames = pageData.results;
      return allPokemonNames;
    });
}

function findPokemonByName(term) {
  const cleanTerm = term.trim().toLowerCase();

  return fetchAllPokemonNames().then((names) => {
    return names
      .filter((entry) => entry.name.includes(cleanTerm))
      .slice(0, searchLimit);
  });
}

function getPokemonImage(details) {
  const sprites = details.sprites;
  const sources = [
    sprites.other?.["official-artwork"]?.front_default,
    sprites.other?.home?.front_default,
    sprites.front_default,
    sprites.versions?.["generation-ix"]?.["scarlet-violet"]?.front_default,
  ];

  return sources.find((url) => url) ?? placeholderImage;
}

function toStatsModel(stats) {
  const result = {};

  stats.forEach((entry) => {
    result[entry.stat.name] = entry.base_stat;
  });

  return result;
}

function toPokemonModel(details) {
  return {
    id: details.id,
    name: details.name,
    types: details.types.map((entry) => entry.type.name),
    image: getPokemonImage(details),
    height: details.height / 10,
    weight: details.weight / 10,
    abilities: details.abilities.map((entry) => entry.ability.name).join(", "),
    stats: toStatsModel(details.stats),
    speciesUrl: details.species.url,
  };
}

function loadPage(page) {
  if (pageCache.has(page)) return Promise.resolve(pageCache.get(page));

  return fetchPageDetails(page).then((details) => {
    const pokemon = details.map((detail) => toPokemonModel(detail));
    pageCache.set(page, pokemon);
    return pokemon;
  });
}

function loadPokemon(pokemon) {
  if (pokemonCache.has(pokemon.url)) {
    return Promise.resolve(pokemonCache.get(pokemon.url));
  }

  return fetchPokemonDetails(pokemon).then((details) => {
    const model = toPokemonModel(details);
    pokemonCache.set(pokemon.url, model);
    return model;
  });
}

function idFromUrl(url) {
  return Number(url.split("/").filter(Boolean).pop());
}

function getEvolutionLevels(chain) {
  const levels = [];
  let current = [chain];

  while (current.length > 0) {
    levels.push(current.map((node) => node.species.url));
    current = current.flatMap((node) => node.evolves_to);
  }

  return levels;
}

function fetchChainData(speciesUrl) {
  return fetch(speciesUrl)
    .then(checkResponse)
    .then((species) => fetch(species.evolution_chain.url))
    .then(checkResponse);
}

function fetchEvolutionChain(speciesUrl) {
  if (evolutionCache.has(speciesUrl)) {
    return Promise.resolve(evolutionCache.get(speciesUrl));
  }

  return fetchChainData(speciesUrl).then((data) => {
    const levels = getEvolutionLevels(data.chain);
    evolutionCache.set(speciesUrl, levels);
    return levels;
  });
}

function loadEvolutionStages(speciesUrls) {
  const loads = speciesUrls.map((url) =>
    loadPokemon({ url: `${apiBaseUrl}/${idFromUrl(url)}/` }),
  );

  return Promise.all(loads);
}
