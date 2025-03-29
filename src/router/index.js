import { createRouter, createWebHistory } from 'vue-router';
import { useSession } from '@/stores/session.js';
import LoginForm from '@/components/LoginForm.vue';
import RegisterForm from '@/components/RegisterForm.vue';
import Contents from '@/components/Contents.vue';
import ContentAdd from '@/components/ContentAdd.vue';
import ContentDetails from '@/components/ContentDetails.vue'; 
import Profil from '@/components/Profil.vue';
import AdminPanel from '@/components/AdminPanel.vue';

const routes = [
  { path: '/login', component: LoginForm },
  { path: '/register', component: RegisterForm },
  { path: '/', component: Contents },
  { path: '/home', component: Contents },
  { path: '/contents', component: Contents },
  { 
    path: '/contents/add', 
    component: ContentAdd,
    meta: { requiresAuth: true }  
  },
  { 
    path: '/profil', 
    component: Profil,
    meta: { requiresAuth: true }  
  },
  { path: '/contents/:id', component: ContentDetails },  
  { path: '/:pathMatch(.*)*', redirect: '/' },  
  { 
    path: '/admin', 
    component: AdminPanel,
    meta: { 
      requiresAuth: true,
      requiresAdmin: true 
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Fonction pour décoder le token de la même manière que le composant Profil
const decodeToken = (token) => {
  try {
    if (!token) {
      console.error("Aucun token fourni");
      return null;
    }

    const decoded = atob(token);
    console.log("Décodé brut :", decoded);

    const parsedArray = JSON.parse(decoded);
    console.log("Tableau parsé :", parsedArray);

    const data = JSON.parse(parsedArray[0]);
    console.log("Données :", data);

    return data.email || null;
  } catch (error) {
    console.error("Erreur lors du décodage du token:", error.message);
    return null;
  }
};

// Fonction pour vérifier si un utilisateur a le rôle admin
async function checkAdminRole(token) {
  if (!token) return false;
  
  try {
    // 1. Décoder le token pour obtenir l'email
    const userEmail = decodeToken(token);
    if (!userEmail) {
      console.error("Impossible d'extraire l'email du token");
      return false;
    }
    
    console.log("Email extrait du token:", userEmail);
    
    // 2. Récupérer tous les utilisateurs
    const usersResponse = await fetch('https://localhost/api/users', {
      headers: {
        'Accept': 'application/ld+json',
        'Authorization': token
      }
    });
    
    if (!usersResponse.ok) {
      console.error("Erreur lors de la récupération des utilisateurs:", usersResponse.statusText);
      return false;
    }
    
    const usersData = await usersResponse.json();
    let users = [];
    
    if (usersData['hydra:member']) {
      users = usersData['hydra:member'];
    } else if (usersData.member) {
      users = usersData.member;
    } else if (Array.isArray(usersData)) {
      users = usersData;
    } else {
      console.error("Format de réponse utilisateurs inattendu");
      return false;
    }
    
    // 3. Trouver l'utilisateur correspondant à l'email
    const currentUser = users.find(user => user.email === userEmail);
    if (!currentUser) {
      console.error("Utilisateur non trouvé pour l'email:", userEmail);
      return false;
    }
    
    console.log("Utilisateur trouvé:", currentUser.email, "avec UUID:", currentUser.uuid);
    
    // 4. Vérifier si l'utilisateur a le rôle admin
    if (currentUser.roles && Array.isArray(currentUser.roles) && 
        currentUser.roles.includes('ROLE_ADMIN')) {
      console.log("L'utilisateur a le rôle ADMIN");
      return true;
    } else {
      console.log("L'utilisateur n'a pas le rôle ADMIN:", currentUser.roles);
      return false;
    }
    
  } catch (error) {
    console.error("Erreur lors de la vérification du rôle admin:", error);
    return false;
  }
}

router.beforeEach(async (to, from, next) => {
  const session = useSession();
  
  console.log('Navigation vers:', to.fullPath);
  console.log('État de la session:', {
    loggedIn: session.loggedIn,
    token: session.token ? "Token présent" : "Pas de token",
    uuid: session.uuid || "Non défini",
    email: session.email || "Non défini"
  });
  
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);

  // Vérifier si l'authentification est requise
  if (requiresAuth && !session.loggedIn) {
    console.log('Authentification requise - redirection vers login');
    sessionStorage.setItem('redirectAfterLogin', to.fullPath);
    return next('/login');
  }

  // Vérifier si les droits admin sont requis
  if (requiresAdmin) {
    console.log('Route admin - vérification des droits');
    
    // Utiliser la fonction de vérification avec le token de session
    const isAdmin = await checkAdminRole(session.token);
    
    if (isAdmin) {
      console.log('Droits admin confirmés, accès autorisé');
      return next();
    } else {
      console.error('Accès refusé: Droits administrateur requis');
      return next('/');
    }
  }

  // Rediriger si déjà connecté et essaie d'accéder à login/register
  if ((to.path === '/login' || to.path === '/register') && session.loggedIn) {
    console.log('Déjà connecté, redirection vers la page d\'accueil');
    return next('/');
  }

  next();
});

export function checkRedirectAfterLogin(router) {
  const redirectPath = sessionStorage.getItem('redirectAfterLogin');
  if (redirectPath) {
    sessionStorage.removeItem('redirectAfterLogin');
    router.push(redirectPath);
  } else {
    router.push('/');
  }
}

export default router;
