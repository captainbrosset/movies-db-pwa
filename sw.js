"use strict";

self.importScripts('/localforage-1.10.0.min.js');

const BACKGROUND_SEARCH_QUERY_TAG = 'background-search-query';
const NEXT_LAUNCH_QUERY_RESULTS_TAG = 'next-launch-query-results';
const BACKGROUND_MOVIE_DETAILS_TAG = 'background-movie-details';
const NEXT_LAUNCH_MOVIE_DETAILS_TAG = 'next-launch-movie-details';

const CACHE_NAME = 'my-movie-list-v3';

const INITIAL_CACHED_RESOURCES = [
    '/',
    '/index.html',
    '/style.css',
    '/favicon.svg',
    '/missing-image.jpg',
    '/script.js',
    '/localforage-1.10.0.min.js',
    '/offline-request-response.json',
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        cache.addAll(INITIAL_CACHED_RESOURCES);
    })());
});

self.addEventListener('activate', function (event) {
    console.log('Claiming control');
    return self.clients.claim();
});

async function searchForMovies(query, dontTryLater) {
    let error = false;
    let response = null;

    try {
        response = await fetch(`https://neighborly-airy-agate.glitch.me/api/movies/${query}`);
        if (response.status !== 200) {
            error = true;
        }
    } catch (e) {
        error = true;
    }

    if (error && !dontTryLater) {
        requestBackgroundSyncForSearchQuery(query);
        const cache = await caches.open(CACHE_NAME);
        response = await cache.match('/offline-request-response.json');
    }

    return response;
}

async function getMovieDetails(id, dontTryLater) {
    let error = false;
    let response = null;

    try {
        response = await fetch(`https://neighborly-airy-agate.glitch.me/api/movie/${id}`);
        if (response.status !== 200) {
            error = true;
        }
    } catch (e) {
        error = true;
    }

    if (error && !dontTryLater) {
        requestBackgroundSyncForMovieDetails(id);
        const cache = await caches.open(CACHE_NAME);
        response = await cache.match('/offline-request-response.json');
    }

    return response;
}

function requestBackgroundSyncForSearchQuery(query) {
    if (!self.registration.sync) {
        return;
    }

    // We're offline. register a Background Sync to do the query again later when online.
    self.registration.sync.register(BACKGROUND_SEARCH_QUERY_TAG);
    // Remember the search query so we can do it later.
    localforage.setItem(BACKGROUND_SEARCH_QUERY_TAG, query);
}

function requestBackgroundSyncForMovieDetails(id) {
    if (!self.registration.sync) {
        return;
    }

    // We're offline. register a Background Sync to do the query again later when online.
    self.registration.sync.register(BACKGROUND_MOVIE_DETAILS_TAG);
    // Remember the id so we can do it later.
    localforage.setItem(BACKGROUND_MOVIE_DETAILS_TAG, id);
}

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const query = url.searchParams.get('s');
    const id = url.searchParams.get('i');

    if (url.pathname === '/search' && query) {
        event.respondWith(searchForMovies(query));
    }

    if (url.pathname === '/details' && id) {
        event.respondWith(getMovieDetails(id));
    }
});

// Network is back up, we're being awaken, let's do the requests we were trying to do before if any.
self.addEventListener('sync', event => {
    // Check if we had a movie search query to do.
    if (event.tag === BACKGROUND_SEARCH_QUERY_TAG) {
        event.waitUntil((async () => {
            // Get the query we were trying to do before.
            const query = await localforage.getItem(BACKGROUND_SEARCH_QUERY_TAG);
            if (!query) {
                return;
            }
            await localforage.removeItem(BACKGROUND_SEARCH_QUERY_TAG);

            const response = await searchForMovies(query, true);
            const data = await response.json();

            // Store the results for the next time the user opens the app. The frontend will use it to
            // populate the page.
            await localforage.setItem(NEXT_LAUNCH_QUERY_RESULTS_TAG, data.Search);

            // Let the user know, if they granted permissions before.
            self.registration.showNotification(`Your search for "${query}" is now ready`, {
                icon: '/favicon.svg',
                body: 'You can access the list of movies in the app',
                actions: [
                    {
                        action: 'view-results',
                        title: 'Open app'
                    }
                ]
            });
        })());
    }

    // Check if we had a movie details request to do.
    if (event.tag === BACKGROUND_MOVIE_DETAILS_TAG) {
        event.waitUntil((async () => {
            // Get the id we were trying to get details about before.
            const id = await localforage.getItem(BACKGROUND_MOVIE_DETAILS_TAG);
            if (!id) {
                return;
            }
            await localforage.removeItem(BACKGROUND_MOVIE_DETAILS_TAG);

            const response = await getMovieDetails(id, true);
            const data = await response.json();

            // Store the results for the next time the user opens the app. The frontend will use it to
            // populate the details section.
            await localforage.setItem(NEXT_LAUNCH_MOVIE_DETAILS_TAG, data);

            // Let the user know, if they granted permissions before.
            self.registration.showNotification(`Movie details are now ready`, {
                icon: "/favicon.svg",
                body: "You can access the details in the app",
                actions: [
                    {
                        action: 'view-details',
                        title: 'Open app'
                    }
                ]
            });
        })());
    }
});
