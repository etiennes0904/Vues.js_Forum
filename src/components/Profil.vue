<template>
  <div class="profile-page">
    <div class="profile-header">
      <h1>Mon Profil</h1>
    </div>

    <div v-if="isLoading" class="loading">
      Chargement des données...
    </div>

    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="profile-info">
        <h2>Informations</h2>
        <p><strong>Email :</strong> {{ user.email || 'Non disponible' }}</p>
        <p><strong>Prénom :</strong> {{ user.firstName || 'Non disponible' }}</p>
        <p><strong>Nom :</strong> {{ user.lastName || 'Non disponible' }}</p>
      </div>

      <div class="user-contents">
        <h2>Mes Publications</h2>
        <ul class="contents-list" v-if="userContents.length > 0">
          <li v-for="content in userContents" :key="content.slug" class="content-item">
            <div class="content-card">
              <img :src="content.coverImage || 'https://via.placeholder.com/150x100?text=Image+non+disponible'" 
                   alt="Image de couverture" class="content-cover" />
              <div class="content-details">
                <h3>{{ content.title }}</h3>
                <p class="content-meta">
                  Publié le {{ new Date(content.createdAt).toLocaleString() }}
                </p>
                <div class="tags-container">
                  <span v-for="tag in content.tags" :key="tag" class="tag-bubble">{{ tag }}</span>
                </div>
                <div class="content-actions">
                  <router-link :to="`/contents/${content.slug}`" class="view-btn">Voir</router-link>
                  <button @click="deleteContent(content.slug)" class="delete-btn">Supprimer</button>
                </div>
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="no-contents">Vous n'avez encore rien publié.</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSession } from '@/stores/session.js';
import { useRouter } from 'vue-router';

const session = useSession();
const router = useRouter();
const user = ref({});
const userContents = ref([]);
const error = ref(null);
const isLoading = ref(true);
const decodedEmail = ref('');


const decodeToken = () => {
  try {

    if (!session.token) {
      console.error("Aucun token dans la session");
      return false;
    }


    const decoded = atob(session.token);
    console.log("Décodé brut :", decoded);


    const parsedArray = JSON.parse(decoded);
    console.log("Tableau parsé :", parsedArray);


    const data = JSON.parse(parsedArray[0]);
    console.log("Données :", data);


    decodedEmail.value = data.email || "Email non trouvé";
    console.log("Email décodé :", decodedEmail.value);
    
    return true;
  } catch (error) {
    console.error("Erreur détaillée lors du décodage :", error.message);
    decodedEmail.value = "";
    return false;
  }
};


const fetchUserProfile = async () => {
  if (!session.loggedIn || !session.token) {
    error.value = 'Vous devez être connecté pour accéder à cette page.';
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {

    const decodingSuccessful = decodeToken();
    if (!decodingSuccessful) {
      error.value = 'Impossible de décoder le token';
      isLoading.value = false;
      return;
    }
    
    console.log('Email identifié depuis le token:', decodedEmail.value);
    

    const response = await fetch('https://localhost/api/users', {
      method: 'GET',
      headers: {
        'Accept': 'application/ld+json',
        'Authorization': `${session.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log('Données des utilisateurs:', data);
    

    let allUsers = [];
    if (data.member) {
      allUsers = data.member;
    } else if (data['hydra:member']) {
      allUsers = data['hydra:member'];
    } else if (Array.isArray(data)) {
      allUsers = data;
    } else {
      throw new Error('Format de réponse inattendu pour les utilisateurs');
    }
    

    const currentUser = allUsers.find(u => u.email === decodedEmail.value);
    
    if (currentUser) {
      user.value = currentUser;
      console.log('Utilisateur actuel trouvé:', currentUser);
      

      if (currentUser.uuid) {
        session.setUuid(currentUser.uuid);
        console.log("UUID stocké dans la session :", currentUser.uuid);
        

        await fetchUserContents(currentUser.uuid);
      } else {
        error.value = "L'utilisateur trouvé n'a pas d'UUID valide.";
      }
    } else {
      error.value = "Impossible de trouver un utilisateur correspondant à l'email décodé.";
      console.warn('Aucun utilisateur trouvé avec l\'email:', decodedEmail.value);
      console.log('Liste des utilisateurs disponibles:', allUsers);
    }
  } catch (err) {
    console.error('Erreur lors de la récupération du profil:', err);
    error.value = `Erreur lors de la récupération du profil: ${err.message}`;
  } finally {
    isLoading.value = false;
  }
};


const fetchUserContents = async (userId) => {
  try {
    const response = await fetch('https://localhost/api/contents', {
      method: 'GET',
      headers: {
        'Accept': 'application/ld+json',
        'Authorization': `${session.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log('Données des contenus:', data);


    const allContents = data.member || data['hydra:member'] || [];
    

    const userIri = `/api/users/${userId}`;
    userContents.value = allContents.filter(content => content.author === userIri);
    console.log('Contenus de l\'utilisateur:', userContents.value);


    await Promise.all(
      userContents.value.map(async (content) => {
        if (content.cover) {
          try {
            const coverId = content.cover.split('/').pop();
            
            const uploadResponse = await fetch(`https://localhost/api/uploads/${coverId}`, {
              method: 'GET',
              headers: {
                'Accept': 'application/ld+json',
                'Authorization': `${session.token}`
              }
            });

            if (uploadResponse.ok) {
              const coverData = await uploadResponse.json();
              content.coverImage = coverData.path 
                ? `https://localhost${coverData.path}` 
                : 'https://via.placeholder.com/150x100?text=Image+non+disponible';
            } else {
              content.coverImage = 'https://via.placeholder.com/150x100?text=Image+non+disponible';
            }
          } catch (err) {
            content.coverImage = 'https://via.placeholder.com/150x100?text=Image+non+disponible';
          }
        } else {
          content.coverImage = 'https://via.placeholder.com/150x100?text=Image+non+disponible';
        }
      })
    );
  } catch (err) {
    console.error('Erreur lors de la récupération des contenus:', err);
    error.value = `Erreur lors de la récupération des contenus: ${err.message}`;
  }
};


const deleteContent = async (slug) => {
  if (!confirm('Voulez-vous vraiment supprimer ce contenu ?')) return;

  try {
    const response = await fetch(`https://localhost/api/contents/${slug}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/ld+json',
        'Authorization': `${session.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }


    userContents.value = userContents.value.filter(content => content.slug !== slug);
  } catch (err) {
    console.error('Erreur lors de la suppression du contenu:', err);
    error.value = `Erreur lors de la suppression: ${err.message}`;
  }
};


onMounted(() => {
  fetchUserProfile();
});
</script>

<style scoped>
.profile-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.profile-header {
  text-align: center;
  margin-bottom: 2rem;
}

.profile-header h1 {
  font-size: 2.5rem;
  color: #4f46e5;
}

.profile-info {
  background-color: #f8fafc;
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.profile-info h2 {
  color: #1e293b;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.profile-info p {
  margin: 0.75rem 0;
  font-size: 1.1rem;
  color: #334155;
}

.user-contents h2 {
  color: #ffffff;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.contents-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.content-item {
  border-radius: 10px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.content-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.content-card {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  height: 100%;
}

.content-cover {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.content-details {
  padding: 1.25rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.content-details h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: #1e293b;
  line-height: 1.4;
}

.content-meta {
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag-bubble {
  background-color: #ddd6fe;
  color: #5b21b6;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.content-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}

.view-btn, .delete-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: background-color 0.2s;
  cursor: pointer;
  border: none;
  text-align: center;
}

.view-btn {
  background-color: #4f46e5;
  color: white;
  flex: 2;
}

.view-btn:hover {
  background-color: #4338ca;
}

.delete-btn {
  background-color: #ef4444;
  color: white;
  flex: 1;
}

.delete-btn:hover {
  background-color: #dc2626;
}

.loading {
  text-align: center;
  padding: 2rem;
  font-size: 1.25rem;
  color: #6b7280;
}

.error {
  background-color: #fee2e2;
  color: #b91c1c;
  padding: 1rem;
  border-radius: 0.5rem;
  margin: 2rem 0;
  border-left: 4px solid #ef4444;
}

.no-contents {
  text-align: center;
  color: #6b7280;
  font-size: 1.1rem;
  margin: 2rem 0;
  padding: 2rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  border: 1px dashed #d1d5db;
}
</style>