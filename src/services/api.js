export const BASE_URL = 'https://localhost/api';

export const api = {
  async get(url) {
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${localStorage.getItem('token')}`, 
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la requête GET');
    }

    return await response.json();
  },

  async post(url, data) {
    const token = localStorage.getItem('token');
    console.log('Token envoyé :', token);
  
    const headers = {
      'Content-Type': 'application/ld+json',
    }
  
    if (token) {
      headers['Authorization'] = `${token}`
    }
  
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  
    return response
  }
  
};
