<template>
  <div v-if="content && Object.keys(content).length > 0" class="content-details-page">
    <div class="thread-header">
      <h2>{{ content.title }}</h2>
      <img :src="content.cover" alt="Image de couverture" class="cover" />
      <p class="meta"><strong>Auteur :</strong> {{ getAuthorEmail(content.author) }}</p>
      <p class="meta"><strong>Publié :</strong> {{ new Date(content.createdAt).toLocaleString() }}</p>
      <p class="thread-body"><strong>Contenu :</strong> {{ content.content }}</p>
      <router-link to="/contents" class="back-btn">Retour au forum</router-link>
    </div>

    <div class="comments-section">
      <h3>Commentaires</h3>
      <ul v-if="filteredComments.length > 0" class="comments-list">
        <li v-for="comment in filteredComments" :key="comment.id" class="comment-item">
          <p><strong class="comment-author">{{ getAuthorEmail(comment.author) || 'Anonyme' }}</strong> : {{ comment.comment }}</p>
          <span class="comment-date">{{ new Date(comment.createdAt).toLocaleString() }}</span>
        </li>
      </ul>
      <p v-else class="no-comments">Aucun commentaire pour le moment.</p>
    </div>

    <div v-if="session.loggedIn" class="comment-add">
      <h3>Ajouter un commentaire</h3>
      <form @submit.prevent="submitComment" class="comment-form" aria-labelledby="comment-form-title">
        <div class="form-group">
          <label for="comment" id="comment-form-title">Votre commentaire</label>
          <textarea
            id="comment"
            v-model="commentData.comment"
            required
            class="form-control"
            rows="4"
            placeholder="Écrivez votre commentaire ici..."
            aria-required="true"
            @focus="onFocus"
            @blur="onBlur"
          ></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="submit-btn" :disabled="!commentData.comment.trim()">Poster</button>
          <button type="button" @click="resetForm" class="cancel-btn">Annuler</button>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-if="success" class="success" role="alert">Commentaire ajouté avec succès !</p>
      </form>
    </div>
    

    <div v-else class="login-message">
      <p>Vous devez être connecté pour poster un commentaire.</p>
      <router-link to="/login" class="login-btn">Se connecter</router-link>
    </div>
  </div>
  <div v-else class="not-found">
    <p>Le contenu demandé n'existe pas ou a été supprimé.</p>
    <router-link to="/contents" class="back-btn">Retour au forum</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSession } from '@/stores/session.js';

const route = useRoute();
const session = useSession();
const content = ref({});
const comments = ref([]);
const commentData = ref({ comment: '' });
const error = ref(null);
const success = ref(false);
const authors = ref({});


const apiCall = async (endpoint, method = 'GET', payload = null) => {
  const headers = {
    'Accept': 'application/ld+json',
    'Content-Type': 'application/ld+json'
  };
  

  if (session.loggedIn && session.token) {
    headers['Authorization'] = `${session.token}`;
  }
  
  const options = {
    method,
    headers
  };
  
  if (payload && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(payload);
  }
  
  const response = await fetch(`https://localhost/api${endpoint}`, options);
  
  if (!response.ok) {
    throw new Error(`Erreur HTTP : ${response.status}`);
  }
  
  return await response.json();
};

const fetchContent = async () => {
  try {
    console.log('Récupération du contenu...');
    const response = await apiCall(`/contents/${route.params.id}`);
    console.log('Contenu récupéré:', response);
    content.value = response;
    

    if (content.value.cover) {
      try {
        const coverId = content.value.cover.split('/').pop();
        const coverData = await apiCall(`/uploads/${coverId}`);
        content.value.cover = coverData.path 
          ? `https://localhost${coverData.path}` 
          : 'https://via.placeholder.com/800x400?text=Image+non+disponible';
      } catch (err) {
        console.warn('Erreur lors de la récupération de l\'image:', err);
        content.value.cover = 'https://via.placeholder.com/800x400?text=Image+non+disponible';
      }
    } else {
      content.value.cover = 'https://via.placeholder.com/800x400?text=Image+non+disponible';
    }
  } catch (err) {
    console.error('Erreur lors de la récupération du contenu :', err);
    content.value = {};
  }
};

const fetchComments = async () => {
  try {
    console.log('Récupération des commentaires...');
    const response = await apiCall('/comments');
    

    if (response.member) {
      comments.value = response.member;
    } else if (response['hydra:member']) {
      comments.value = response['hydra:member'];
    } else if (Array.isArray(response)) {
      comments.value = response;
    } else {
      comments.value = [];
    }
    
    await loadAuthors();
  } catch (err) {
    console.error('Erreur lors de la récupération des commentaires :', err);
    comments.value = [];
  }
};

const filteredComments = computed(() => {
  const contentIri = `/api/contents/${route.params.id}`;
  return comments.value.filter(comment => comment.content === contentIri);
});

const loadAuthors = async () => {
  try {
    const allUUIDs = [
      ...new Set([
        content.value.author?.split('/').pop(),
        ...filteredComments.value.map(comment => comment.author?.split('/').pop()),
      ].filter(Boolean)),
    ];
    
    if (allUUIDs.length === 0) return;
    
    const authorPromises = allUUIDs.map(async (uuid) => {
      try {
        const response = await apiCall(`/users/${uuid}`);
        return { 
          uuid, 
          email: response.email || 'Inconnu',
          name: response.firstName && response.lastName 
            ? `${response.firstName} ${response.lastName}` 
            : response.email || 'Inconnu'
        };
      } catch (err) {
        console.warn(`Erreur récupération auteur ${uuid}:`, err);
        return { uuid, email: 'Inconnu', name: 'Inconnu' };
      }
    });

    const authorResults = await Promise.all(authorPromises);
    authors.value = authorResults.reduce((acc, author) => {
      acc[author.uuid] = author.name || author.email;
      return acc;
    }, {});
  } catch (error) {
    console.error('Erreur chargement auteurs :', error);
  }
};

const getAuthorEmail = (authorIri) => {
  if (!authorIri) return 'Inconnu';
  const uuid = authorIri.split('/').pop();
  return authors.value[uuid] || 'Inconnu';
};

const resetForm = () => {
  commentData.value.comment = '';
  error.value = null;
  success.value = false;
};

const submitComment = async () => {
  error.value = null;
  success.value = false;


  if (!session.loggedIn || !session.token) {
    error.value = 'Veuillez vous connecter pour poster un commentaire.';
    return;
  }

  try {
    const payload = {
      comment: commentData.value.comment,
      content: `/api/contents/${route.params.id}`,
    };


    const responseData = await apiCall('/comments', 'POST', payload);

    if (responseData['@id']) {

      comments.value.push({
        id: responseData['@id'],
        comment: responseData.comment,
        author: responseData.author,
        content: responseData.content,
        createdAt: responseData.createdAt,
      });
      
      await loadAuthors();
      success.value = true;
      resetForm();
    } else {
      throw new Error('Réponse invalide de l\'API');
    }
  } catch (err) {
    error.value = 'Erreur lors de l\'ajout du commentaire : ' + err.message;
    console.error('Erreur API :', err);
  }
};

const onFocus = () => {
  document.querySelector('.form-control')?.classList.add('focused');
};

const onBlur = () => {
  document.querySelector('.form-control')?.classList.remove('focused');
};

onMounted(() => {
  fetchContent();
  fetchComments();
});
</script>

<style scoped>
.content-details-page {
  max-width: 900px;
  margin: 20px auto;
  background: #24243e;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  color: #e0e0e0;
}

.thread-header {
  margin-bottom: 30px;
}

h2 {
  font-size: 2rem;
  color: #fff;
  margin-bottom: 20px;
  font-weight: 600;
}

.cover {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.meta {
  font-size: 1rem;
  color: #a0a0c0;
  margin-bottom: 10px;
}

.thread-body {
  font-size: 1.1rem;
  color: #e0e0e0;
  line-height: 1.6;
  margin-bottom: 20px;
}

.back-btn {
  display: inline-block;
  padding: 10px 20px;
  background: #4b5563;
  color: #e0e0e0;
  text-decoration: none;
  border-radius: 25px;
  font-weight: 600;
  transition: background 0.2s ease;
}

.back-btn:hover {
  background: #374151;
}

.comments-section {
  margin-top: 40px;
}

h3 {
  font-size: 1.5rem;
  color: #fff;
  margin-bottom: 20px;
  font-weight: 600;
}

.comments-list {
  list-style: none;
  padding: 0;
}

.comment-item {
  background: #2d2d4a;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 15px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.comment-author {
  color: #6366f1;
  font-weight: 600;
}

.comment-date {
  font-size: 0.8rem;
  color: #6b7280;
  display: block;
  margin-top: 5px;
}

.no-comments {
  color: #a0a0c0;
  font-style: italic;
}

.comment-add {
  margin-top: 40px;
}

.login-message {
  margin-top: 40px;
  text-align: center;
  background: #2d2d4a;
  padding: 20px;
  border-radius: 12px;
  border: 1px dashed #6366f1;
}

.login-message p {
  margin-bottom: 15px;
  color: #a0a0c0;
}

.login-btn {
  display: inline-block;
  padding: 10px 25px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  color: #fff;
  text-decoration: none;
  border-radius: 25px;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.comment-form {
  background: #2d2d4a;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.comment-form:hover {
  transform: translateY(-2px);
}

.form-group {
  margin-bottom: 20px;
}

label {
  font-size: 1.1rem;
  color: #a0a0c0;
  margin-bottom: 12px;
  font-weight: 500;
  display: block;
}

.form-control {
  padding: 12px;
  border: 2px solid #4b5563;
  border-radius: 10px;
  background: #1a1a2e;
  color: #e0e0e0;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  width: 100%;
  box-sizing: border-box;
}

.form-control:focus,
.form-control.focused {
  border-color: #6366f1;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.3);
  outline: none;
}

.form-control::placeholder {
  color: #6b7280;
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
}

.submit-btn {
  padding: 10px 25px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  color: #fff;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.submit-btn:disabled {
  background: #4b5563;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cancel-btn {
  padding: 10px 25px;
  background: #4b5563;
  color: #e0e0e0;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.cancel-btn:hover {
  background: #374151;
}

.error {
  color: #ef4444;
  font-size: 0.9rem;
  margin-top: 10px;
  background: rgba(239, 68, 68, 0.1);
  padding: 8px;
  border-radius: 8px;
}

.success {
  color: #10b981;
  font-size: 0.9rem;
  margin-top: 10px;
  background: rgba(16, 185, 129, 0.1);
  padding: 8px;
  border-radius: 8px;
}

.not-found {
  text-align: center;
  padding: 20px;
  color: #e0e0e0;
}
</style>