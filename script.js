"use strict";

const searchField = document.querySelector('#search');
const moviesContainer = document.querySelector('.movies');
const sidebarContainer = document.querySelector('aside');
const sidebarCloseBtn = document.querySelector('aside .close');
const sidebarMovieEl = document.querySelector('aside .movie');
const mainOfflineErrorEl = document.querySelector('main .error');
const sidebarOfflineErrorEl = document.querySelector('aside .error');

const NEXT_LAUNCH_QUERY_RESULTS_TAG = 'next-launch-query-results';
const NEXT_LAUNCH_MOVIE_DETAILS_TAG = 'next-launch-movie-details';

async function searchForMovies(title) {
    try {
        const response = await fetch(`/search?s=${title}`);
        return await response.json();
    } catch (e) {
        console.error('Error fetching movies', e);
        return null;
    }
}

async function getMovieDetails(id) {
    try {
        const response = await fetch(`/details?i=${id}`);
        const data = await response.json();

        if (data.error && data.error === 'offline') {
            displayMovieDetailsOfflineError();
        }

        return data;
    } catch (e) {
        console.error('Error get movie details', e);
        return null;
    }
}

function displayMovieListOfflineError() {
    toggleNotificationPermissionMessage();

    mainOfflineErrorEl.style.display = 'block';
    moviesContainer.style.display = 'none';
}

function displayMovieDetailsOfflineError() {
    toggleNotificationPermissionMessage();

    sidebarOfflineErrorEl.style.display = 'block';
    sidebarMovieEl.style.display = 'none';
}

function toggleNotificationPermissionMessage() {
    document.querySelectorAll('.error .grant-permission').forEach(el => {
        el.style.display = Notification.permission === 'granted' ? 'none' : 'block';
    });
}

function createShortMovieItem(movie) {
    const el = document.createElement('li');
    el.classList.add('movie');
    el.dataset.id = movie.id;

    const title = document.createElement('h2');
    title.title = movie.name;
    title.textContent = movie.name;
    el.appendChild(title);

    const year = document.createElement('p');
    year.classList.add('year');
    year.textContent = `Year: ${movie.date}`;
    el.appendChild(year);

    const poster = document.createElement('img');
    poster.src = movie.poster;
    el.appendChild(poster);

    const moreInfoBtn = document.createElement('button');
    moreInfoBtn.classList.add('more-info');
    moreInfoBtn.textContent = 'More info';
    el.appendChild(moreInfoBtn);

    const addToListBtn = document.createElement('button');
    addToListBtn.classList.add('add-to-list');
    el.appendChild(addToListBtn);
    updateAddToListButtonState(addToListBtn, movie.id);

    return el;
}

async function updateAddToListButtonState(addToListBtn, id) {
    const stored = await localforage.getItem(id);

    addToListBtn.textContent = stored ? 'X' : 'Add';
    addToListBtn.classList.toggle('stored', stored);
    addToListBtn.title = stored ? 'Remove from your list' : 'Add to your list';
}

function createFullMovieItem(movie) {
    const el = createShortMovieItem(movie);

    el.querySelector('.more-info').remove();
    el.querySelector('.add-to-list').remove();

    const director = document.createElement('p');
    director.classList.add('director');
    director.textContent = `Director: ${movie.director}`;
    el.appendChild(director);

    const actors = document.createElement('p');
    actors.classList.add('actors');
    actors.textContent = `Actors: ${movie.actors}`;
    el.appendChild(actors);

    const plot = document.createElement('p');
    plot.classList.add('plot');
    plot.textContent = `${movie.description}`;
    el.appendChild(plot);

    return el;
}

function prepareMovieList() {
    moviesContainer.innerHTML = '';
    moviesContainer.style.display = 'grid';
    mainOfflineErrorEl.style.display = 'none';
}

function emptySideBarMovie() {
    sidebarMovieEl.innerHTML = '';
}

function showSideBar() {
    sidebarContainer.classList.add('visible');
}

function hideSideBar() {
    sidebarContainer.classList.remove('visible');
}

function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    }
}

function showMyList() {
    prepareMovieList();

    localforage.iterate(movie => {
        if (movie && movie.name) {
            const li = createShortMovieItem(movie);
            moviesContainer.appendChild(li);
        }
    });
}

function showSearchResults(movies) {
    prepareMovieList();

    if (!movies) {
        return;
    }

    for (const movie of movies) {
        const li = createShortMovieItem(movie);
        moviesContainer.appendChild(li);
    }
}

function showDetailsSidebar(data) {
    if (!data) {
        return;
    }

    emptySideBarMovie();
    showSideBar();

    if (data.error && data.error === 'offline') {
        return;
    }

    sidebarMovieEl.style.display = 'grid';
    sidebarOfflineErrorEl.style.display = 'none';

    const el = createFullMovieItem(data);
    sidebarMovieEl.innerHTML = el.innerHTML;
}

searchField.addEventListener('keyup', debounce(async function () {
    if (searchField.value.length < 3) {
        showMyList();
        return;
    }

    const data = await searchForMovies(searchField.value);
    
    if (!data) {
        showSearchResults([]);
    } else if (data.error && data.error === 'offline') {
        displayMovieListOfflineError();
        return [];
    } else {
        showSearchResults(data);
    }
}, 500));

sidebarCloseBtn.addEventListener('click', () => {
    hideSideBar();
});

addEventListener('click', async e => {
    const btn = e.target;
    if (!btn.classList.contains('more-info')) {
        return;
    }

    const id = btn.closest('.movie').dataset.id;
    const data = await getMovieDetails(id);

    showDetailsSidebar(data);
});

addEventListener('click', async e => {
    const btn = e.target;
    if (!btn.classList.contains('add-to-list')) {
        return;
    }

    const id = btn.closest('.movie').dataset.id;

    const stored = await localforage.getItem(id);
    if (!stored) {
        const data = await getMovieDetails(id);
        await localforage.setItem(id, data);
    } else {
        await localforage.removeItem(id);
    }

    updateAddToListButtonState(btn, id);
});

addEventListener('click', async e => {
    const btn = e.target;
    if (!btn.classList.contains('permission') || Notification.permission === 'granted') {
        return;
    }

    Notification.requestPermission().then(function (result) {
        toggleNotificationPermissionMessage();
    });
});

// First render. There are several cases possible:
// - If we stored some search query and/or movie details data during a background sync, show those
//   right away.
// - If not, show the user movie list.
localforage.getItem(NEXT_LAUNCH_QUERY_RESULTS_TAG).then(async data => {
    if (!data) {
        showMyList();
    } else {
        showSearchResults(data);
        await localforage.removeItem(NEXT_LAUNCH_QUERY_RESULTS_TAG);
    }
});

localforage.getItem(NEXT_LAUNCH_MOVIE_DETAILS_TAG).then(async data => {
    if (data) {
        showDetailsSidebar(data);
        await localforage.removeItem(NEXT_LAUNCH_MOVIE_DETAILS_TAG);
    }
});