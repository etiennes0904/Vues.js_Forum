<template>
  <div class="register-container">
    <div class="overlay">
      <h2>Inscription</h2>
      <form @submit.prevent="register">
        <label for="email">Email :</label>
        <input id="email" v-model="email" type="email" required />

        <label for="password">Mot de passe :</label>
        <input id="password" v-model="password" type="password" required />

        <label for="firstname">Prénom :</label>
        <input id="firstname" v-model="firstname" type="text" required />

        <label for="lastname">Nom :</label>
        <input id="lastname" v-model="lastname" type="text" required />

        <button type="submit">S'inscrire</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import UserService from '@/services/UserService.js';

const email = ref('');
const password = ref('');
const firstname = ref('');
const lastname = ref('');
const error = ref(null);
const router = useRouter();

const register = async () => {
  error.value = null;

  if (!email.value || !password.value || !firstname.value || !lastname.value) {
    error.value = 'Tous les champs sont obligatoires.';
    return;
  }

  const userData = {
    email: email.value,
    password: password.value,
    firstName: firstname.value,
    lastName: lastname.value,
  };

  console.log('Données envoyées à l\'API :', userData);

  try {
    const response = await UserService.register(userData);
    console.log('Utilisateur créé avec succès :', response);
    router.push('/login');
  } catch (err) {
    error.value = 'Erreur lors de l\'inscription. Vérifiez vos informations.';
    console.error('Erreur API :', err);
  }
};
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay {
  background: #24243e;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
  text-align: center;
  color: #e0e0e0;
}

h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 1.5rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  font-size: 1rem;
  font-weight: 500;
  color: #a0a0c0;
  text-align: left;
}

input {
  padding: 0.8rem;
  border: 1px solid #4b5563;
  border-radius: 8px;
  background: #2d2d4a;
  color: #e0e0e0;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s ease;
}

input:focus {
  border-color: #6366f1;
}

button {
  padding: 0.8rem;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

button:hover {
  background: #4f46e5;
}

.error {
  color: #ef4444;
  font-size: 0.9rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .overlay {
    padding: 1.5rem;
    width: 90%;
  }
}
</style>
