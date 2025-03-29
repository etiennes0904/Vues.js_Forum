import { api } from './api.js';

const UserService = {
  async register(userData) {
    return await api.post('/users', userData);
  },

  async login(credentials) {
    return await api.post('/login', credentials, false); 
  },
};

export default UserService;