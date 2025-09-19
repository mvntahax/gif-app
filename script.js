// ===== DOM ELEMENT REFERENCES =====
const form = document.getElementById('searchFormWrapper');   // Search form wrapper (submit triggers a fetch)
const input = document.getElementById('searchInput');        // Main search input
const gifContainer = document.getElementById('gifContainer'); // Grid/container where GIF cards render
const currentTitle = document.getElementById('currentTitle'); // Heading above results (e.g., "results for 'cats'")
const tagList = document.getElementById('tagList');          // UL for related tag suggestions
const tagSearchInput = document.getElementById('tagSearchInput'); // Input to get related tags from Giphy
const modal = document.getElementById('gifModal');           // Modal element for viewing a single GIF
const modalGif = document.getElementById('modalGif');        // <img> inside modal that shows the selected GIF

// ===== APP STATE =====
const apiKey = 'eaPfVQoheFdqg0tFezSqAEpAsVjzgdP6';          // Giphy API key
let selectedGifUrl = '';                                     // Currently selected GIF URL (for copy/download)
let selectedGifTitle = '';                                   // Currently selected GIF title (for download filename)
let currentGif = null;                                       // Entire GIF object of the item opened in modal

// ===== CORE: FETCH & RENDER GIFS =====
async function fetchGIFs(query) {
  // Update page title + show loading skeleton
  currentTitle.textContent = `results for "${query}"`;
  gifContainer.innerHTML = '<p class="col-span-full text-center text-gray-400">loading...</p>';

  let endpoint;

  // Special pseudo-queries
  if (query.toLowerCase() === 'favorites') {
    // Show locally stored favorites instead of calling API
    displayFavorites();
    return;
  } else if (query.toLowerCase() === 'trending') {
    // Trending endpoint (PG-rated)
    endpoint = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=25&rating=pg`;
  } else {
    // Regular search (encode user query; larger limit for more choice)
    endpoint = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=100&rating=pg`;
  }

  try {
    // Call Giphy
    const res = await fetch(endpoint);
    const data = await res.json();

    // Clear loading state
    gifContainer.innerHTML = '';

    // Empty results UX
    if (!data.data.length) {
      gifContainer.innerHTML = '<p class="col-span-full text-center text-gray-400">no results found!</p>';
      return;
    }

    // Render each GIF as a card
    data.data.forEach((gif) => {
      const gifBox = document.createElement('div');
      gifBox.className = 'bg-gray-800 rounded-lg overflow-hidden aspect-[1/1] shadow-md cursor-pointer relative group';

      // Card content with overlay + favorite button (hidden until hover)
      gifBox.innerHTML = `
        <img src="${gif.images.fixed_height.url}" alt="${gif.title}" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2 text-white text-sm">
          <p class="font-bold truncate">${gif.title || 'Untitled'}</p>
          <p class="text-xs">${gif.username ? `By: ${gif.username}` : 'creator unknown'}</p>
        </div>
        <button aria-label="add to favorites" title="add to favorites" class="absolute top-2 right-2 bg-purple-600 bg-opacity-70 rounded-full px-2 py-1 hidden group-hover:block hover:bg-purple-700 transition">
          <i class="bi bi-heart text-white"></i>
        </button>
      `;

      // Favorite button handler (stores minimal info in localStorage)
      const favBtn = gifBox.querySelector('button');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();          // Prevent modal from opening
        addToFavorites(gif);
        favBtn.classList.add('hidden'); // Hide button after adding
      });

      // Clicking the card opens modal view
      gifBox.onclick = () => openModal(gif);

      gifContainer.appendChild(gifBox);
    });
  } catch (err) {
    // Network/API errors
    gifContainer.innerHTML = '<p class="col-span-full text-center text-red-500">error loading GIFs.</p>';
    console.error(err);
  }
}

// ===== TOAST UTILITY =====
function showToast(message) {
  // Simple 3-second toast using a pre-existing DOM node
  const toast = document.getElementById('toastNotification');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ===== FAVORITES (LOCAL STORAGE) =====
function addToFavorites(gif) {
  // Get favorites array; default to empty
  const favorites = JSON.parse(localStorage.getItem('gifFavorites') || '[]');

  // Avoid duplicates by ID
  if (!favorites.find((fav) => fav.id === gif.id)) {
    favorites.push({
      id: gif.id,
      url: gif.images.fixed_height.url,
      title: gif.title,
      username: gif.username
    });
    localStorage.setItem('gifFavorites', JSON.stringify(favorites));
    showToast(`added "${gif.title || 'GIF'}" to favorites!`);
  } else {
    showToast('already in favorites!');
  }
}

function displayFavorites() {
  // Replace grid with favorites list
  currentTitle.textContent = 'your favorites';
  const favorites = JSON.parse(localStorage.getItem('gifFavorites') || '[]');
  gifContainer.innerHTML = '';

  if (favorites.length === 0) {
    gifContainer.innerHTML = '<p class="col-span-full text-center text-gray-400">no favorites yet! click the heart on a GIF to add!</p>';
    return;
  }

  // Render favorite items similarly to search results, but with "remove" button
  favorites.forEach((gif) => {
    const gifBox = document.createElement('div');
    gifBox.className = 'bg-gray-800 rounded-lg overflow-hidden aspect-[1/1] shadow-md cursor-pointer relative group';
    gifBox.innerHTML = `
      <img src="${gif.url}" alt="${gif.title}" class="w-full h-full object-cover" />
      <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-2 text-white text-sm">
        <p class="font-bold truncate">${gif.title || 'Untitled'}</p>
        <p class="text-xs">${gif.username ? `by: ${gif.username}` : 'creator unknown'}</p>
      </div>
      <button aria-label="remove from favorites" title="remove from favorites" class="absolute top-2 right-2 bg-red-600 bg-opacity-70 rounded-full px-2 py-1 hidden group-hover:block hover:bg-red-700 transition">
        <i class="bi bi-trash text-white"></i>
      </button>
    `;

    // Remove button deletes by ID and re-renders favorites
    const removeBtn = gifBox.querySelector('button');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromFavorites(gif.id);
      displayFavorites();
    });

    // Open in modal on card click
    gifBox.onclick = () => openModal(gif);

    gifContainer.appendChild(gifBox);
  });
}

function removeFromFavorites(id) {
  // Filter out the removed item, persist, and notify
  let favorites = JSON.parse(localStorage.getItem('gifFavorites') || '[]');
  favorites = favorites.filter((gif) => gif.id !== id);
  localStorage.setItem('gifFavorites', JSON.stringify(favorites));
  showToast(`removed GIF from favorites!`);
}

// ===== INITIAL LOAD =====
fetchGIFs('trending'); // Show trending GIFs on first paint

// ===== GLOBAL EVENT LISTENERS =====

// Search form submit => execute search with input value
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = input.value.trim();
  if (val) {
    fetchGIFs(val);
  }
});

// Delegated click handler for any <a data-query="..."> links (e.g., tag pills)
// Also closes mobile menus if present
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-query]');
  if (!link) return;

  e.preventDefault();
  const query = link.dataset.query;
  if (!query) return;

  if (window.input) input.value = '';
  fetchGIFs(query);

  // Optional mobile UI handling
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileTags = document.getElementById('mobileTags');
  mobileMenu && mobileMenu.classList.add('hidden');
  mobileTags && mobileTags.classList.add('hidden');
});

// ===== RELATED TAGS AUTOCOMPLETE (GIPHY TAGS API) =====
tagSearchInput.addEventListener('input', async () => {
  const query = tagSearchInput.value.trim();

  // Clear list when field is empty
  if (!query) {
    tagList.innerHTML = '';
    return;
  }

  try {
    // Ask Giphy for tags related to the typed query
    const response = await fetch(`https://api.giphy.com/v1/tags/related/${encodeURIComponent(query)}?api_key=${apiKey}`);
    const data = await response.json();

    tagList.innerHTML = '';

    // No suggestions UX
    if (!data.data.length) {
      tagList.innerHTML = '<li class="text-gray-400">no related tags found!</li>';
      return;
    }

    // Build clickable hashtag list (each triggers a GIF search)
    data.data.forEach((tagObj) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.dataset.query = tagObj.name;
      a.textContent = `#${tagObj.name}`;
      a.className = 'text-purple-300 hover:text-purple-100 transition cursor-pointer';

      a.addEventListener('click', (e) => {
        e.preventDefault();
        input.value = '';
        fetchGIFs(tagObj.name);
      });

      li.appendChild(a);
      tagList.appendChild(li);
    });
  } catch (error) {
    console.error('error fetching related tags:', error);
    tagList.innerHTML = '<li class="text-red-400">Failed to load tags.</li>';
  }
});

// Pressing Enter in the tag search jumps to the first suggestion
tagSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const firstTag = tagList.querySelector('a');
    if (firstTag) {
      const query = firstTag.dataset.query;
      input.value = '';
      fetchGIFs(query);
    }
  }
});

// ===== MODAL: OPEN/CLOSE/COPY/DOWNLOAD =====
function openModal(gif) {
  // Persist selected item in state
  currentGif = gif;

  // Prefer original size; fall back to stored URL
  const gifUrl = gif.images?.original?.url || gif.url;
  const title = gif.title || 'gif';

  // Reset modal for a tiny reflow (clears previous src)
  modal.classList.add('hidden');
  modalGif.src = '';
  void modal.offsetWidth; // Force reflow to restart CSS animations if any

  // Inject new GIF and show modal
  modalGif.src = gifUrl;
  selectedGifUrl = gifUrl;
  selectedGifTitle = title;
  modal.classList.remove('hidden');

  // Load "similar" grid using the GIF title as query
  loadSimilarGIFs(title);
}

// Close button listener (guarded with optional chaining)
document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);

function closeModal() {
  // Hide modal and release image to stop playback
  document.getElementById('gifModal').classList.add('hidden');
  document.getElementById('modalGif').src = '';
  document.getElementById('similarGifs').innerHTML = '';
}

// Copy to clipboard (URL of selected GIF)
document.getElementById('copyBtn')?.addEventListener('click', copyGifLink);
function copyGifLink() {
  navigator.clipboard.writeText(selectedGifUrl).then(() => {
    showToast(`GIF link copied to clipboard!`);
  });
}

// Download selected GIF by fetching blob and creating a temporary <a download>
document.getElementById('downloadBtn')?.addEventListener('click', downloadGif);
async function downloadGif() {
  try {
    const response = await fetch(selectedGifUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedGifTitle.replace(/\s+/g, '_') || 'gif'}.gif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('failed to download GIF:', err);
    showToast(`download failed!`);
  }
}

// ===== "SIMILAR GIFS" SIDECAR =====
async function loadSimilarGIFs(title) {
  const container = document.getElementById('similarGifs');
  if (!container) return;

  // Lightweight loading indicator
  container.innerHTML = `<div class="col-span-full text-center animate-pulse text-gray-400 text-center">loading similar GIFs...</div>`;

  try {
    // Use the title as query to simulate "similar"
    const endpoint = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(title)}&limit=100&rating=pg`;
    const res = await fetch(endpoint);
    const data = await res.json();

    container.innerHTML = '';

    const filteredGIFs = data.data;

    if (!filteredGIFs.length) {
      container.innerHTML = `<p class="text-gray-400 text-sm text-center col-span-full">couldn't find similar GIFs! try a different one!</p>`;
      return;
    }

    // Render small clickable thumbs; clicking opens that GIF in modal
    filteredGIFs.forEach(gif => {
      const gifElem = document.createElement('img');
      gifElem.src = gif.images.fixed_height.url;
      gifElem.alt = gif.title || 'Similar GIF';
      gifElem.className = 'w-24 h-24 object-cover rounded cursor-pointer transition hover:scale-105';

      gifElem.addEventListener('click', () => openModal(gif));
      container.appendChild(gifElem);
    });

  } catch (error) {
    console.error('error loading similar GIFs:', error);
    container.innerHTML = `<p class="text-red-400 text-sm text-center col-span-full">oops! something went wrong...</p>`;
  }
}