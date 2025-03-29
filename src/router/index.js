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


router.beforeEach(async (to, from, next) => {
  const session = useSession();
  
  console.log('Navigation vers:', to.fullPath);
  console.log('État de la session:', {
    loggedIn: session.loggedIn,
    uuid: session.uuid,
    email: session.email || 'non défini'
  });
  

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);


  if (requiresAuth && !session.loggedIn) {
    console.log('Authentification requise - redirection vers login');
    sessionStorage.setItem('redirectAfterLogin', to.fullPath);
    return next('/login');
  }

  if (requiresAdmin) {
    console.log('Route admin - vérification des droits');
    
 
    

    if (session.email && adminEmails.includes(session.email.toLowerCase())) {
      console.log('Email reconnu comme admin, accès autorisé');
      return next(); 
    }
    

    if (session.uuid) {
      try {
        console.log('Tentative de vérification du profil utilisateur');
        

        const response = await fetch(`https://localhost/api/users/${session.uuid}`, {
          headers: {
            'Accept': 'application/ld+json',
            'Authorization': session.token
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Profil utilisateur récupéré:', userData);
          

          if (userData.roles && userData.roles.includes('ROLE_ADMIN')) {
            console.log('Utilisateur confirmé comme admin par l\'API');
            if (userData.email && !session.email) {
              localStorage.setItem('email', userData.email);
            }
            return next(); 
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du profil:', error);
      }
    }
    

    

    console.error('Accès refusé: Droits administrateur requis');
    return next('/');
  }


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