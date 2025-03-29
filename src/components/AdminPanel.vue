<template>
  <div class="admin-panel">
    <h1>Administration</h1>
    
    <div class="admin-section">
      <h2>Créer un nouvel utilisateur administrateur</h2>
      <form @submit.prevent="createAdmin" class="admin-form">
        <div class="form-group">
          <label for="firstName">Prénom</label>
          <input type="text" id="firstName" v-model="newAdmin.firstName" required />
        </div>
        <div class="form-group">
          <label for="lastName">Nom</label>
          <input type="text" id="lastName" v-model="newAdmin.lastName" required />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="newAdmin.email" required />
        </div>
        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input type="password" id="password" v-model="newAdmin.password" required />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-create">Créer administrateur</button>
        </div>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>
    </div>
    
    <div class="admin-section">
      <div class="section-header">
        <h2>Liste des utilisateurs</h2>
        <button @click="fetchUsers" class="btn-refresh">Rafraîchir</button>
      </div>
      <ul class="users-list" v-if="users.length > 0">
        <li v-for="user in users" :key="user.uuid" class="user-item">
          <div class="user-info">
            <span class="user-name">{{ user.firstName }} {{ user.lastName }}</span>
            <span class="user-email">{{ user.email }}</span>
            <span class="user-roles">{{ user.roles && user.roles.length ? user.roles.join(', ') : 'Aucun rôle' }}</span>
          </div>
          <div class="user-actions">
            <button 
              @click="promoteToAdmin(user)" 
              :disabled="user.roles?.includes('ROLE_ADMIN')"
              class="btn-promote">
              Promouvoir
            </button>
            <button 
              @click="demoteFromAdmin(user)" 
              :disabled="!user.roles?.includes('ROLE_ADMIN') || user.email === session.email"
              class="btn-demote">
              Rétrograder
            </button>
            <button 
              v-if="user.roles?.includes('ROLE_ADMIN') && user.roles?.includes('ROLE_USER')" 
              @click="removeUserRole(user)"
              class="btn-fix"
              title="Supprimer le rôle utilisateur redondant">
              Fixer rôle
            </button>
            <button 
              @click="confirmDeleteUser(user)"
              :disabled="user.email === session.email"
              class="btn-delete">
              Supprimer
            </button>
          </div>
        </li>
      </ul>
      <p v-else-if="loading.users" class="loading-message">Chargement des utilisateurs...</p>
      <p v-else>Aucun utilisateur trouvé</p>
    </div>
    
    <div class="admin-section">
      <div class="section-header">
        <h2>Liste des contenus</h2>
        <button @click="fetchContents" class="btn-refresh">Rafraîchir</button>
      </div>
      <ul class="contents-list" v-if="contents.length > 0">
        <li v-for="content in contents" :key="content.id" class="content-item">
          <div class="content-info">
            <span class="content-title">{{ content.title }}</span>
            <span class="content-date">{{ formatDate(content.createdAt) }}</span>
            <span class="content-preview">{{ truncateText(content.content, 100) }}</span>
          </div>
          <div class="content-actions">
            <button @click="confirmDeleteContent(content)" class="btn-delete">
              Supprimer
            </button>
          </div>
        </li>
      </ul>
      <p v-else-if="loading.contents" class="loading-message">Chargement des contenus...</p>
      <p v-else>Aucun contenu trouvé</p>
    </div>

    <div class="admin-section">
      <div class="section-header">
        <h2>Liste des commentaires</h2>
        <button @click="fetchComments" class="btn-refresh">Rafraîchir</button>
      </div>
      <ul class="comments-list" v-if="comments.length > 0">
        <li v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-info">
            <span class="comment-content">{{ truncateText(comment.content, 100) }}</span>
            <span class="comment-author">Par: {{ comment.user?.email || 'Anonyme' }}</span>
            <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
          </div>
          <div class="comment-actions">
            <button @click="confirmDeleteComment(comment)" class="btn-delete">
              Supprimer
            </button>
          </div>
        </li>
      </ul>
      <p v-else-if="loading.comments" class="loading-message">Chargement des commentaires...</p>
      <p v-else>Aucun commentaire trouvé</p>
    </div>

    <div v-if="showDeleteUserModal" class="modal">
      <div class="modal-content">
        <h3>Confirmer la suppression</h3>
        <p>Voulez-vous vraiment supprimer l'utilisateur {{ deletingUser?.email }} ?</p>
        <div class="modal-actions">
          <button @click="deleteUser" class="btn-confirm">Oui</button>
          <button @click="showDeleteUserModal = false" class="btn-cancel">Non</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteContentModal" class="modal">
      <div class="modal-content">
        <h3>Confirmer la suppression</h3>
        <p>Voulez-vous vraiment supprimer le contenu "{{ deletingContent?.title }}" ?</p>
        <div class="modal-actions">
          <button @click="deleteContent" class="btn-confirm">Oui</button>
          <button @click="showDeleteContentModal = false" class="btn-cancel">Non</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteCommentModal" class="modal">
      <div class="modal-content">
        <h3>Confirmer la suppression</h3>
        <p>Voulez-vous vraiment supprimer ce commentaire ?</p>
        <div class="modal-actions">
          <button @click="deleteComment" class="btn-confirm">Oui</button>
          <button @click="showDeleteCommentModal = false" class="btn-cancel">Non</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSession } from '@/stores/session.js';

const session = useSession();
const users = ref([]);
const contents = ref([]);
const comments = ref([]);
const error = ref('');
const success = ref('');
const showDeleteUserModal = ref(false);
const showDeleteContentModal = ref(false);
const showDeleteCommentModal = ref(false);
const deletingUser = ref(null);
const deletingContent = ref(null);
const deletingComment = ref(null);
const loading = ref({
  users: false,
  contents: false,
  comments: false
});

const newAdmin = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
});

const formatDate = (dateString) => {
  if (!dateString) return 'Date inconnue';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const truncateText = (text, maxLength) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const apiCall = async (endpoint, method = 'GET', payload = null) => {
  const headers = {
    'Accept': 'application/ld+json',
    'Content-Type': 'application/ld+json',
    'Authorization': `${session.token}`
  };
  
  const options = {
    method,
    headers
  };
  
  if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(payload);
  }
  
  const response = await fetch(`https://localhost/api${endpoint}`, options);
  
  if (!response.ok) {
    try {
      const errorData = await response.json();
      if (errorData.violations) {
        const errors = errorData.violations.map(v => `${v.propertyPath}: ${v.message}`).join(', ');
        throw new Error(`Validation échouée: ${errors}`);
      }
      throw new Error(errorData.detail || errorData.message || errorData.title || `Erreur HTTP : ${response.status}`);
    } catch (parseError) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }
  }
  
  if (method === 'DELETE') return true;
  return await response.json();
};

const fetchUsers = async () => {
  try {
    loading.value.users = true;
    error.value = '';
    const response = await apiCall('/users');
    users.value = response['hydra:member'] || response.member || response || [];
    users.value = users.value.map(user => ({
      ...user,
      roles: user.roles || []
    }));
  } catch (err) {
    error.value = `Erreur lors du chargement des utilisateurs : ${err.message}`;
  } finally {
    loading.value.users = false;
  }
};

const fetchContents = async () => {
  try {
    loading.value.contents = true;
    error.value = '';
    const response = await apiCall('/contents');
    contents.value = response['hydra:member'] || response.member || response || [];
  } catch (err) {
    error.value = `Erreur lors du chargement des contenus : ${err.message}`;
  } finally {
    loading.value.contents = false;
  }
};

const fetchComments = async () => {
  try {
    loading.value.comments = true;
    error.value = '';
    const response = await apiCall('/comments');
    comments.value = response['hydra:member'] || response.member || response || [];
  } catch (err) {
    error.value = `Erreur lors du chargement des commentaires : ${err.message}`;
  } finally {
    loading.value.comments = false;
  }
};

const createAdmin = async () => {
  try {
    error.value = '';
    success.value = '';
    const adminPayload = {
      firstName: newAdmin.value.firstName,
      lastName: newAdmin.value.lastName,
      email: newAdmin.value.email,
      password: newAdmin.value.password,
      roles: ['ROLE_ADMIN']
    };
    await apiCall('/users', 'POST', adminPayload);
    success.value = `Administrateur ${newAdmin.value.email} créé avec succès.`;
    newAdmin.value = { firstName: '', lastName: '', email: '', password: '' };
    await fetchUsers();
  } catch (err) {
    error.value = `Erreur lors de la création de l'administrateur : ${err.message}`;
  }
};

const confirmDeleteUser = (user) => {
  deletingUser.value = user;
  showDeleteUserModal.value = true;
};

const deleteUser = async () => {
  try {
    error.value = '';
    success.value = '';
    await apiCall(`/users/${deletingUser.value.uuid}`, 'DELETE');
    success.value = `Utilisateur ${deletingUser.value.email} supprimé avec succès`;
    showDeleteUserModal.value = false;
    await fetchUsers();
    deletingUser.value = null;
  } catch (err) {
    error.value = `Erreur lors de la suppression : ${err.message}`;
  }
};

const confirmDeleteContent = (content) => {
  deletingContent.value = content;
  showDeleteContentModal.value = true;
};

const deleteContent = async () => {
  try {
    error.value = '';
    success.value = '';
    await apiCall(`/contents/${deletingContent.value.id}`, 'DELETE');
    success.value = `Contenu "${deletingContent.value.title}" supprimé avec succès`;
    showDeleteContentModal.value = false;
    await fetchContents();
    deletingContent.value = null;
  } catch (err) {
    error.value = `Erreur lors de la suppression : ${err.message}`;
  }
};

const confirmDeleteComment = (comment) => {
  deletingComment.value = comment;
  showDeleteCommentModal.value = true;
};

const deleteComment = async () => {
  try {
    error.value = '';
    success.value = '';
    await apiCall(`/comments/${deletingComment.value.id}`, 'DELETE');
    success.value = `Commentaire supprimé avec succès`;
    showDeleteCommentModal.value = false;
    await fetchComments();
    deletingComment.value = null;
  } catch (err) {
    error.value = `Erreur lors de la suppression : ${err.message}`;
  }
};

const removeUserRole = async (user) => {
  try {
    error.value = '';
    success.value = '';
    if (!user.roles?.includes('ROLE_USER') || !user.roles?.includes('ROLE_ADMIN')) return;
    
    const newRoles = user.roles.filter(role => role !== 'ROLE_USER');
    const headers = {
      'Content-Type': 'application/merge-patch+json',
      'Accept': 'application/ld+json',
      'Authorization': `${session.token}`
    };
    await fetch(`https://localhost/api/users/${user.uuid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ roles: newRoles })
    });
    success.value = `Rôle USER supprimé pour ${user.email}`;
    await fetchUsers();
  } catch (err) {
    error.value = `Erreur lors de la suppression du rôle : ${err.message}`;
  }
};

const updateUserRole = async (user, role) => {
  try {
    const newRoles = role === 'ROLE_ADMIN' ? ['ROLE_ADMIN'] : ['ROLE_USER'];
    const headers = {
      'Content-Type': 'application/merge-patch+json',
      'Accept': 'application/ld+json',
      'Authorization': `${session.token}`
    };
    await fetch(`https://localhost/api/users/${user.uuid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ roles: newRoles, email: user.email })
    });
    await fetchUsers();
  } catch (err) {
    throw err;
  }
};

const promoteToAdmin = async (user) => {
  try {
    error.value = '';
    success.value = '';
    if (!user.roles?.includes('ROLE_ADMIN')) {
      await updateUserRole(user, 'ROLE_ADMIN');
      success.value = `${user.email} promu administrateur`;
    }
  } catch (err) {
    error.value = `Erreur lors de la promotion : ${err.message}`;
  }
};

const demoteFromAdmin = async (user) => {
  try {
    error.value = '';
    success.value = '';
    if (user.roles?.includes('ROLE_ADMIN') && user.email !== session.email) {
      await updateUserRole(user, 'ROLE_USER');
      success.value = `${user.email} rétrogradé`;
    }
  } catch (err) {
    error.value = `Erreur lors de la rétrogradation : ${err.message}`;
  }
};

onMounted(async () => {
  await fetchUsers();
  await fetchContents();
  await fetchComments();
});
</script>

<style scoped>
.admin-panel {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  color: #e0e0e0;
}

h1 {
  font-size: clamp(1.5rem, 5vw, 2.5rem);
  color: #fff;
  text-align: center;
  margin-bottom: 1.5rem;
}

.admin-section {
  background: #24243e;
  border-radius: 12px;
  padding: clamp(1rem, 5vw, 1.5rem);
  margin-bottom: 2rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

h2 {
  color: #fff;
  font-size: clamp(1.2rem, 4vw, 1.5rem);
  margin-bottom: 1rem;
  border-bottom: 1px solid #4b5563;
  padding-bottom: 0.5rem;
}

.admin-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.form-group label {
  margin-bottom: 0.5rem;
  color: #a0a0c0;
  font-weight: 500;
}

.form-group input {
  padding: 0.75rem;
  background: #1a1a2e;
  border: 1px solid #4b5563;
  border-radius: 8px;
  color: #e0e0e0;
}

.form-group input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

button {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-create {
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
}

.btn-create:hover:not(:disabled) {
  background: linear-gradient(90deg, #5457e5, #7b4ce6);
  transform: translateY(-2px);
}

.btn-refresh {
  background: #3b82f6;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-refresh:hover {
  background: #2563eb;
}

.btn-promote {
  background: #10b981;
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  padding: 0.5rem 0.75rem;
}

.btn-promote:hover:not(:disabled) {
  background: #059669;
}

.btn-demote {
  background: #ef4444;
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  padding: 0.5rem 0.75rem;
}

.btn-demote:hover:not(:disabled) {
  background: #dc2626;
}

.btn-fix {
  background: #6366f1;
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  padding: 0.5rem 0.75rem;
}

.btn-fix:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-delete {
  background: #dc2626;
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  padding: 0.5rem 0.75rem;
}

.btn-delete:hover:not(:disabled) {
  background: #b91c1c;
}

.users-list, .contents-list, .comments-list {
  list-style: none;
  padding: 0;
}

.user-item, .content-item, .comment-item {
  background: #2d2d4a;
  border-radius: 8px;
  padding: clamp(0.75rem, 3vw, 1rem);
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .user-item, .content-item, .comment-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.user-info, .content-info, .comment-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

@media (min-width: 768px) {
  .user-info, .content-info, .comment-info {
    margin-bottom: 0;
  }
}

.user-name, .content-title {
  font-weight: 600;
  color: #fff;
  font-size: 1.1rem;
}

.user-email, .content-date, .comment-author, .comment-date {
  color: #a0a0c0;
  font-size: 0.875rem;
}

.content-preview, .comment-content {
  color: #d1d5db;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-top: 0.5rem;
}

.user-roles {
  font-size: 0.875rem;
  color: #6366f1;
}

.user-actions, .content-actions, .comment-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.error {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
  padding: 0.75rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.success {
  color: #10b981;
  background-color: rgba(16, 185, 129, 0.1);
  padding: 0.75rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.loading-message {
  text-align: center;
  color: #a0a0c0;
  padding: 1rem;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: #24243e;
  padding: clamp(1rem, 5vw, 1.5rem);
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  color: #e0e0e0;
}

.modal-content h3 {
  color: #fff;
  margin-bottom: 1rem;
  font-size: clamp(1.1rem, 3vw, 1.25rem);
}

.modal-actions {
  display: flex;
  gap: 0.625rem;
  justify-content: flex-end;
  margin-top: 1.25rem;
}

.btn-confirm {
  background: #dc2626;
}

.btn-confirm:hover {
  background: #b91c1c;
}

.btn-cancel {
  background: #6b7280;
}

.btn-cancel:hover {
  background: #4b5563;
}

@media (max-width: 600px) {
  .user-actions, .content-actions, .comment-actions {
    margin-top: 1rem;
    justify-content: flex-start;
  }
  
  .form-actions {
    justify-content: center;
  }
  
  button {
    padding: 0.5rem 1rem;
  }
}
</style>