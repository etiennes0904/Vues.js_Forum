<template>
  <div class="forum-home">
    <div class="search-filter-bar">
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher par titre, auteur ou contenu..."
          class="search-input"
          @input="applySearch"
          aria-label="Rechercher dans le forum"
        />
        <span class="search-icon">🔍</span>
      </div>
      <div class="filter-container">
        <select v-model="filterTag" @change="applyFilters" class="filter-select" aria-label="Filtrer par tag">
          <option value="">Tous les tags</option>
          <option v-for="tag in uniqueTags" :key="tag" :value="tag">{{ tag }}</option>
        </select>
        <select v-model="sortOrder" @change="applyFilters" class="filter-select" aria-label="Trier par date">
          <option value="desc">Plus récent</option>
          <option value="asc">Plus ancien</option>
        </select>
      </div>
    </div>

    <div class="forum-header">
      <h1>Bienvenue sur le Forum</h1>
      <router-link v-if="session.loggedIn" to="/contents/add" class="new-post-btn">Nouveau Post</router-link>
      <router-link v-else to="/login" class="new-post-btn">Se connecter pour poster</router-link>
    </div>

    <div class="threads-container">
      <ul class="threads-list">
        <li v-for="content in filteredContents" :key="content.slug" class="thread-item">
          <div class="thread-card">
            <img :src="content.cover" alt="Image de couverture" class="thread-cover" />
            <div class="thread-content">
              <h2 class="thread-title">{{ content.title }}</h2>
              <p class="thread-meta">
                Par <span class="author">{{ getAuthorName(content.author) }}</span> •
                {{ new Date(content.createdAt).toLocaleString() }}
              </p>
              <div class="tags-container">
                <span v-for="tag in content.tags" :key="tag" class="tag-bubble">{{ tag }}</span>
              </div>
              <router-link :to="`/contents/${content.slug}`" class="view-thread-btn">Lire le fil</router-link>
            </div>
          </div>
        </li>
      </ul>
      <div v-if="isLoading" class="loading-spinner">
        Chargement des contenus...
      </div>
      <div v-else-if="filteredContents.length === 0" class="no-content">
        Aucun contenu trouvé.
      </div>
      <div v-else class="pagination">
        <button @click="fetchContents(currentPage - 1)" :disabled="currentPage <= 1" class="pagination-btn">Précédent</button>
        <span class="page-info">Page {{ currentPage }}</span>
        <button @click="fetchContents(currentPage + 1)" :disabled="!hasNextPage" class="pagination-btn">Suivant</button>
      </div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useSession } from '@/stores/session.js';

const contents = ref([]);
const filteredContents = ref([]);
const error = ref(null);
const currentPage = ref(1);
const hasNextPage = ref(false);
const authors = ref({});
const searchQuery = ref('');
const filterTag = ref('');
const sortOrder = ref('desc');
const session = useSession();
const isLoading = ref(true);


const apiCall = async (endpoint) => {
  const headers = {
    'Accept': 'application/ld+json',
    'Content-Type': 'application/json'
  };
  

  if (session.loggedIn && session.token) {
    headers['Authorization'] = `${session.token}`;
  }
  
  const response = await fetch(`https://localhost/api${endpoint}`, {
    method: 'GET',
    headers: headers
  });
  
  if (!response.ok) {
    throw new Error(`Erreur HTTP : ${response.status}`);
  }
  
  return await response.json();
};

const fetchContents = async (page = 1) => {
  isLoading.value = true;
  error.value = null;
  
  try {
    console.log(`Récupération des contenus pour la page ${page}...`);
    

    const response = await apiCall(`/contents?page=${page}`);
    console.log('Réponse API contenus :', response);
    

    let contentList = [];
    if (response.member) {
      contentList = response.member;
    } else if (response['hydra:member']) {
      contentList = response['hydra:member'];
    } else if (Array.isArray(response)) {
      contentList = response;
    } else {
      throw new Error('Format de réponse inattendu');
    }
    

    const contentsWithImages = await Promise.all(
      contentList.map(async (content) => {
        if (content.cover) {
          try {
  
            const coverId = content.cover.split('/').pop();
            
            const uploadResponse = await apiCall(`/uploads/${coverId}`);
            content.cover = uploadResponse.path 
              ? `https://localhost${uploadResponse.path}` 
              : 'https://via.placeholder.com/150x100?text=Image+non+disponible';
          } catch (err) {
            console.warn(`Erreur récupération image pour ${content.slug}:`, err);
            content.cover = 'https://via.placeholder.com/150x100?text=Image+non+disponible';
          }
        } else {
          content.cover = 'https://via.placeholder.com/150x100?text=Image+non+disponible';
        }
        return content;
      })
    );
    
    contents.value = contentsWithImages;
    currentPage.value = page;
    

    if (response.view && response.view.next) {
      hasNextPage.value = true;
    } else if (response['hydra:view'] && response['hydra:view']['hydra:next']) {
      hasNextPage.value = true;
    } else {
      hasNextPage.value = false;
    }
    

    await loadAuthors();
    

    applyFilters();
    
  } catch (err) {
    error.value = `Erreur lors du chargement des contenus : ${err.message}`;
    console.error('Erreur API :', err);
  } finally {
    isLoading.value = false;
  }
};

const loadAuthors = async () => {
  try {

    const allUUIDs = [...new Set(
      contents.value
        .map(content => {
          if (content.author) {
            const parts = content.author.split('/');
            return parts[parts.length - 1];
          }
          return null;
        })
        .filter(Boolean)
    )];
    
    if (allUUIDs.length === 0) return;
    

    const authorPromises = allUUIDs.map(async (uuid) => {
      try {
        const user = await apiCall(`/users/${uuid}`);
        return { 
          uuid, 
          fullName: user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.email || 'Utilisateur' 
        };
      } catch (err) {
        console.warn(`Erreur récupération auteur ${uuid}:`, err);
        return { uuid, fullName: 'Auteur inconnu' };
      }
    });
    
    const authorResults = await Promise.all(authorPromises);
    

    authors.value = authorResults.reduce((acc, author) => {
      acc[author.uuid] = author.fullName;
      return acc;
    }, {});
    
  } catch (error) {
    console.error('Erreur chargement auteurs :', error);
  }
};

const getAuthorName = (authorIri) => {
  if (!authorIri) return 'Auteur inconnu';
  
  try {
    const uuid = authorIri.split('/').pop();
    return authors.value[uuid] || 'Auteur inconnu';
  } catch (err) {
    return 'Auteur inconnu';
  }
};

const uniqueTags = computed(() => {
  const allTags = contents.value.flatMap(content => content.tags || []);
  return [...new Set(allTags)].sort();
});

const applySearch = () => {
  applyFilters();
};

const applyFilters = () => {
  let result = [...contents.value];
  

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(content => {
      const titleMatch = content.title?.toLowerCase().includes(query);
      const authorMatch = getAuthorName(content.author)?.toLowerCase().includes(query);
      const contentMatch = content.content?.toLowerCase().includes(query);
      return titleMatch || authorMatch || contentMatch;
    });
  }
  

  if (filterTag.value) {
    result = result.filter(content => 
      content.tags && Array.isArray(content.tags) && content.tags.includes(filterTag.value)
    );
  }
  
  
  result.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return sortOrder.value === 'desc' ? dateB - dateA : dateA - dateB;
  });
  
  filteredContents.value = result;
};

onMounted(() => {
  fetchContents();
});
</script>

<style scoped>
.forum-home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #1a1a2e;
  color: #e0e0e0;
  min-height: 100vh;
}

.search-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #24243e;
  padding: 15px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  margin-bottom: 20px;
  position: sticky;
  top: 70px;
  z-index: 900;
}

.search-container {
  position: relative;
  flex: 1;
  max-width: 500px;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 15px;
  border: 2px solid #4b5563;
  border-radius: 25px;
  background: #2d2d4a;
  color: #e0e0e0;
  font-size: 1rem;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.3);
  outline: none;
}

.search-input::placeholder {
  color: #6b7280;
}

.search-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #a0a0c0;
  font-size: 1.2rem;
}

.filter-container {
  display: flex;
  gap: 15px;
  margin-left: 20px;
}

.filter-select {
  padding: 10px 15px;
  border: 2px solid #4b5563;
  border-radius: 25px;
  background: #2d2d4a;
  color: #e0e0e0;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.filter-select:focus {
  border-color: #6366f1;
  outline: none;
}

.forum-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.forum-header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #fff;
}

.new-post-btn {
  padding: 10px 20px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  color: #fff;
  text-decoration: none;
  border-radius: 25px;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.new-post-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.threads-list {
  list-style: none;
  padding: 0;
}

.thread-item {
  margin-bottom: 20px;
}

.thread-card {
  display: flex;
  background: #24243e;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
  min-height: 140px;
}

.thread-card:hover {
  transform: translateY(-4px);
}

.thread-cover {
  width: 180px;
  height: 120px;
  object-fit: cover;
  flex-shrink: 0;
}

.thread-content {
  padding: 20px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.thread-title {
  font-size: 1.6rem;
  margin: 0 0 12px;
  color: #fff;
}

.thread-meta {
  font-size: 1rem;
  color: #a0a0c0;
  margin-bottom: 12px;
}

.author {
  color: #6366f1;
  font-weight: 600;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tag-bubble {
  padding: 6px 12px;
  background: #4b5563;
  color: #e0e0e0;
  border-radius: 15px;
  font-size: 0.85rem;
  font-weight: 500;
  transition: background 0.2s ease;
}

.tag-bubble:hover {
  background: #6366f1;
}

.view-thread-btn {
  display: inline-block;
  padding: 10px 20px;
  background: #3b82f6;
  color: #fff;
  text-decoration: none;
  border-radius: 25px;
  font-size: 1rem;
  transition: background 0.2s ease;
  align-self: flex-start;
}

.view-thread-btn:hover {
  background: #2563eb;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
}

.pagination-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.pagination-btn:disabled {
  background: #4b5563;
  cursor: not-allowed;
}

.pagination-btn:hover:not(:disabled) {
  background: #2563eb;
}

.page-info {
  font-size: 1rem;
  color: #a0a0c0;
}

.error {
  color: #ef4444;
  text-align: center;
  margin-top: 20px;
  padding: 15px;
  background-color: rgba(239, 68, 68, 0.15);
  border-radius: 8px;
  border-left: 4px solid #ef4444;
}

.loading-spinner {
  text-align: center;
  padding: 40px 0;
  color: #a0a0c0;
  font-size: 1.2rem;
}

.no-content {
  text-align: center;
  padding: 40px 0;
  color: #a0a0c0;
  font-size: 1.2rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin: 20px 0;
}

@media (max-width: 768px) {
  .search-filter-bar {
    flex-direction: column;
    gap: 15px;
  }
  
  .filter-container {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }
  
  .thread-card {
    flex-direction: column;
  }
  
  .thread-cover {
    width: 100%;
    height: 180px;
  }
}
</style>