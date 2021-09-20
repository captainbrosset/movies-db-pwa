"use strict";

const OMDB_API_KEY = 'd1693e4b';
const searchField = document.querySelector('#search');
const moviesContainer = document.querySelector('.movies');
const sidebarContainer = document.querySelector('aside');
const sidebarCloseBtn = document.querySelector('aside .close');
const sidebarMovieEl = document.querySelector('aside .movie');

async function searchForMovies(title) {
    try {
        const response = await fetch(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${title}`);
        const data = await response.json();
        return data.Search;
    } catch (e) {
        console.error('Error fetching movies', e);
        return [];
    }
}

async function getMovieDetails(id) {
    try {
        const response = await fetch(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${id}`);
        const data = await response.json();
        return data;
    } catch (e) {
        console.error('Error get movie details', e);
        return null;
    }
}

function createShortMovieItem(movie) {
    const el = document.createElement('li');
    el.classList.add('movie');
    el.dataset.imdbId = movie.imdbID;

    const title = document.createElement('h2');
    title.title = movie.Title;
    title.textContent = movie.Title;
    el.appendChild(title);

    const year = document.createElement('p');
    year.classList.add('year');
    year.textContent = `Year: ${movie.Year}`;
    el.appendChild(year);

    const poster = document.createElement('img');
    poster.src = movie.Poster;
    el.appendChild(poster);

    const moreInfoBtn = document.createElement('button');
    moreInfoBtn.classList.add('more-info');
    moreInfoBtn.textContent = 'More info';
    el.appendChild(moreInfoBtn);

    const addToListBtn = document.createElement('button');
    addToListBtn.classList.add('add-to-list');
    el.appendChild(addToListBtn);
    updateAddToListButtonState(addToListBtn, movie.imdbID);

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

    const genre = document.createElement('p');
    genre.classList.add('genre');
    genre.textContent = `Genre: ${movie.Genre}`;
    el.appendChild(genre);

    const director = document.createElement('p');
    director.classList.add('director');
    director.textContent = `Director: ${movie.Director}`;
    el.appendChild(director);

    const actors = document.createElement('p');
    actors.classList.add('actors');
    actors.textContent = `Actors: ${movie.Actors}`;
    el.appendChild(actors);

    const plot = document.createElement('p');
    plot.classList.add('plot');
    plot.textContent = `${movie.Plot}`;
    el.appendChild(plot);

    return el;
}

function emptyMovies() {
    moviesContainer.innerHTML = '';
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
    emptyMovies();

    localforage.iterate(movie => {
        const li = createShortMovieItem(movie);
        moviesContainer.appendChild(li);
    });
}

searchField.addEventListener('keyup', debounce(async function () {
    if (searchField.value.length < 3) {
        showMyList();
        return;
    }

    emptyMovies();

    const movies = await searchForMovies(searchField.value);
    if (!movies) {
        return;
    }
    for (const movie of movies) {
        const li = createShortMovieItem(movie);
        moviesContainer.appendChild(li);
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

    emptySideBarMovie();
    showSideBar();

    const id = btn.closest('.movie').dataset.imdbId;
    const data = await getMovieDetails(id);

    const el = createFullMovieItem(data);
    sidebarMovieEl.innerHTML = el.innerHTML;
});

addEventListener('click', async e => {
    const btn = e.target;
    if (!btn.classList.contains('add-to-list')) {
        return;
    }

    const id = btn.closest('.movie').dataset.imdbId;

    const stored = await localforage.getItem(id);
    if (!stored) {
        const data = await getMovieDetails(id);
        await localforage.setItem(id, data);
    } else {
        await localforage.removeItem(id);
    }

    updateAddToListButtonState(btn, id);
});

// First render.
showMyList();
