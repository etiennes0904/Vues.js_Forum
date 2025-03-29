import { defineStore } from 'pinia';

export const useSession = defineStore('session', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    uuid: localStorage.getItem('uuid') || null,
  }),

  getters: {
    loggedIn: (state) => !!state.token,
    userId: (state) => state.uuid,
  },

  actions: {
    login(token, uuid = null) {
      this.token = token;
      localStorage.setItem('token', token);
      

      if (uuid) {
        this.uuid = uuid;
        localStorage.setItem('uuid', uuid);
      }
    },
    

    setUuid(uuid) {
      this.uuid = uuid;
      localStorage.setItem('uuid', uuid);
    },
    
    logout() {
      this.token = null;
      this.uuid = null;
      localStorage.removeItem('token');
      localStorage.removeItem('uuid');
    },
  },
});