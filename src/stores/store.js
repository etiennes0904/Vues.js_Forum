import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useSession = defineStore('session', () => {
  const user = ref(null);
  const token = ref(localStorage.getItem('token') || null);
  
  const loggedIn = computed(() => !!token.value);
  
  function login(userData, tokenValue) {
    user.value = userData;
    token.value = tokenValue;
    localStorage.setItem('token', tokenValue);
  }
  
  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
  }
  
  return {
    user,
    token,
    loggedIn,
    login,
    logout
  };
});