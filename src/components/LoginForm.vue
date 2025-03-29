<template>  
  <div class="login-container">
    <div class="overlay">
      <h2>Connexion</h2>
      <form @submit.prevent="login">
        <label for="email">Email :</label>
        <input id="email" v-model="email" type="email" required />

        <label for="password">Mot de passe :</label>
        <input id="password" v-model="password" type="password" required />

        <button type="submit">Se connecter</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="register-link">
        <p>Pas encore de compte ? <router-link to="/register">S'inscrire</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSession } from '@/stores/session.js';
import UserService from '@/services/UserService.js';
import { checkRedirectAfterLogin } from '@/router';

const email = ref('');
const password = ref('');
const error = ref(null);
const router = useRouter();
const session = useSession();

const login = async () => {
  error.value = null;

  try {

    const response = await UserService.login({
      email: email.value,
      password: password.value,
    });


    const data = await response.json(); 
    console.log('Données retournées par l\'API :', data);


    if (data.token) {

      session.login(data.token);
      

      checkRedirectAfterLogin(router);
    } else {
      throw new Error('Token manquant dans la réponse de l\'API.');
    }
  } catch (err) {

    error.value = 'Identifiants incorrects ou erreur de serveur.';
    console.error('Erreur API :', err);
  }
};
</script>

<style scoped>

.login-container {
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

.register-link {
  margin-top: 1.5rem;
  font-size: 0.9rem;
}

.register-link a {
  color: #6366f1;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}

.register-link a:hover {
  color: #4f46e5;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .overlay {
    padding: 1.5rem;
    width: 90%;
  }
}
</style>