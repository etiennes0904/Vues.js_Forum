<template>
  <div class="app-container">
    <header class="forum-nav">
      <div class="nav-left">
        <img src="@/assets/favicon.png" alt="Logo" class="nav-logo" />
        <router-link to="/" class="nav-brand">Forum</router-link>
      </div>
      <nav class="nav-links">
        <router-link to="/Contents" class="nav-link">Accueil</router-link>
        <router-link v-if="session.loggedIn" to="/Profil" class="nav-link">Profil</router-link>
        <div v-if="!session.loggedIn" class="auth-links">
          <router-link to="/login" class="nav-link">Connexion</router-link>
          <router-link to="/register" class="nav-link">Inscription</router-link>
        </div>
        <div v-else class="user-menu">
          <span class="user-email">{{ session.user?.email }}</span>
          <button @click="handleLogout" class="logout-btn">Déconnexion</button>
        </div>
      </nav>
    </header>
    <main class="forum-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useSession } from '@/stores/session.js';

const session = useSession();
const router = useRouter();

const handleLogout = () => {
  session.logout();
  router.push('/login');
};
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: #1a1a2e;
  color: #e0e0e0;
  font-family: 'Inter', sans-serif;
}

.forum-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: #24243e;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.nav-logo {
  width: 40px;
  height: 40px;
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-link {
  color: #ffffff;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: #6366f1;
}

.auth-links {
  display: flex;
  gap: 20px;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-email {
  font-size: 0.9rem;
  color: #a0a0c0;
}

.logout-btn {
  padding: 8px 16px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s ease;
}

.logout-btn:hover {
  background: #dc2626;
}

.forum-content {
  padding: 20px;
}

@media (max-width: 768px) {
  .forum-nav {
    flex-direction: column;
    padding: 10px 20px;
  }

  .nav-links {
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }

  .user-menu {
    flex-direction: column;
    gap: 10px;
  }
}
</style>