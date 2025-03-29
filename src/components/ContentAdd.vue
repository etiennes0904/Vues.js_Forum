<template>
  <div class="content-add">
    <h2>Ajouter un nouveau contenu</h2>
    
    <form @submit.prevent="submitContent" class="content-form">
      <div class="form-group">
        <label for="title">Titre</label>
        <input 
          id="title" 
          v-model="content.title" 
          type="text" 
          class="form-control" 
          required
        >
      </div>
      
      <div class="form-group">
        <label for="metaTitle">Meta Titre</label>
        <input 
          id="metaTitle" 
          v-model="content.metaTitle" 
          type="text" 
          class="form-control" 
          required
        >
      </div>
      
      <div class="form-group">
        <label for="metaDescription">Meta Description</label>
        <textarea 
          id="metaDescription" 
          v-model="content.metaDescription" 
          class="form-control" 
          required
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="content">Contenu</label>
        <textarea 
          id="content" 
          v-model="content.content" 
          class="form-control content-textarea" 
          required
        ></textarea>
      </div>
      
      <div class="form-group">
        <label for="tags">Tags (séparés par des virgules)</label>
        <input 
          id="tags" 
          v-model="tags" 
          type="text" 
          class="form-control"
        >
      </div>
      
      <div class="form-group">
        <label for="cover">Image de couverture</label>
        <input
          id="cover"
          type="file"
          accept="image/*"
          class="form-control"
          @change="handleFileChange"
        >
        <p v-if="coverPreview" class="preview-text">Aperçu : <img :src="coverPreview" alt="Aperçu" class="preview-image" /></p>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="btn-submit">Ajouter le contenu</button>
      </div>
    </form>
    
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="success" class="success" role="alert">Contenu ajouté avec succès !</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '@/stores/session.js';

const router = useRouter();
const session = useSession();
const error = ref(null);
const success = ref(false);
const tags = ref('');
const coverFile = ref(null);
const coverPreview = ref('');
const uploadedUuid = ref(null);
const content = ref({
  title: '',
  content: '',
  cover: null,
  metaTitle: '',
  metaDescription: '',
  tags: [],
});

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    coverFile.value = file;
    coverPreview.value = URL.createObjectURL(file);
  } else {
    coverFile.value = null;
    coverPreview.value = '';
  }
};


const uploadImage = async () => {
  if (!coverFile.value) return null;
  
  console.log('Début de l\'upload de l\'image...');
  

  const headers = new Headers();
  headers.append('Authorization', session.token);
  headers.append('Accept', 'application/ld+json');

  

  const formData = new FormData();
  formData.append('file', coverFile.value);
  
  try {
    console.log('Envoi de la requête d\'upload vers /api/uploads');
    
    const response = await fetch('https://localhost/api/uploads', {
      method: 'POST',
      headers: headers,
      body: formData,
      redirect: 'follow'
    });
    
    if (!response.ok) {
      console.error('Erreur upload HTTP:', response.status);
      const errorText = await response.text();
      console.error('Réponse d\'erreur:', errorText);
      throw new Error(`Erreur lors de l'upload (${response.status})`);
    }
    
    const result = await response.json();
    console.log('Résultat upload:', result);
    

    uploadedUuid.value = result.uuid;
    

    return `/api/uploads/${result.uuid}/`;
  } catch (error) {
    console.error('Erreur lors de l\'upload de l\'image:', error);
    throw new Error('Erreur lors de l\'upload de l\'image: ' + error.message);
  }
};

const submitContent = async () => {
  error.value = null;
  success.value = false;

  if (!session.loggedIn) {
    error.value = 'Utilisateur non connecté.';
    console.error('Erreur : utilisateur non connecté.');
    return;
  }

  try {

    const contentData = {
      title: content.value.title,
      content: content.value.content,
      metaTitle: content.value.metaTitle,
      metaDescription: content.value.metaDescription,
      tags: tags.value ? tags.value.split(',').map(tag => tag.trim()) : []
    };


    if (coverFile.value) {
      try {
        console.log('Début de l\'upload de l\'image');
        contentData.cover = await uploadImage();
        console.log('Image uploadée avec succès:', contentData.cover);
      } catch (uploadError) {
        console.error('Échec de l\'upload image:', uploadError);
        error.value = 'Erreur lors de l\'upload de l\'image: ' + uploadError.message;
        return; 
      }
    }


    console.log('Envoi des données du contenu:', contentData);
    
    const contentHeaders = new Headers();
    contentHeaders.append('Authorization', session.token);
    contentHeaders.append('Content-Type', 'application/ld+json');
    contentHeaders.append('Accept', 'application/ld+json');
    
    const contentResponse = await fetch('https://localhost/api/contents', {
      method: 'POST',
      headers: contentHeaders,
      body: JSON.stringify(contentData)
    });
    
    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      console.error('Erreur création de contenu:', errorText);
      throw new Error(`Erreur lors de la création du contenu (${contentResponse.status})`);
    }
    
    const contentResult = await contentResponse.json();
    console.log('Contenu créé avec succès:', contentResult);
    

    success.value = true;
    content.value = {
      title: '',
      content: '',
      cover: null,
      metaTitle: '',
      metaDescription: '',
      tags: [],
    };
    tags.value = '';
    coverFile.value = null;
    coverPreview.value = '';
    uploadedUuid.value = null;
  } catch (err) {
    if (err.message.includes('<')) {
      error.value = 'Erreur serveur : vérifiez les journaux côté backend.';
    } else {
      error.value = err.message || 'Erreur lors de la création du contenu.';
    }
    console.error('Erreur API :', err);
  }
};
</script>

<style scoped>
.content-add {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.content-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-control {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.content-textarea {
  min-height: 200px;
  resize: vertical;
}

.form-actions {
  margin-top: 20px;
}

.btn-submit {
  padding: 10px 15px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.btn-submit:hover {
  background-color: #45a049;
}

.error {
  color: #d32f2f;
  margin-top: 20px;
  padding: 10px;
  background-color: #ffebee;
  border-radius: 4px;
}

.success {
  color: #388e3c;
  margin-top: 20px;
  padding: 10px;
  background-color: #e8f5e9;
  border-radius: 4px;
}

.preview-text {
  margin-top: 10px;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  margin-top: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>