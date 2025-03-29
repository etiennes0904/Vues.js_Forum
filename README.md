Danny QuestionQuest Une plateforme de forum moderne permettant aux utilisateurs de partager du contenu et d'interagir avec la communauté.

Description du projet Danny QuestionQuest est une application web de forum développée avec Vue.js 3 pour le frontend et une API en Symfony pour le backend. Les utilisateurs peuvent s'inscrire, se connecter, publier des contenus avec des images, commenter les publications et gérer leur profil. L'application inclut également une interface d'administration pour la gestion des utilisateurs, des contenus et des commentaires.

Fonctionnalités principales Système d'authentification complet (inscription, connexion) Publication de contenus avec upload d'images Commentaires sur les publications Système de tags et de filtrage du contenu Profil utilisateur personnalisé Panneau d'administration pour les utilisateurs avec rôle admin Interface responsive et moderne

Prérequis Node.js (v16+) NPM ou Yarn Un serveur local pour l'API (Apache/Nginx avec PHP 8+) Base de données MySQL/MariaDB

Installation et configuration

Cloner le dépôt git clone https://github.com/etienne-sautivet/search-films.git cd search-films

Installer les dépendances npm install

Configuration de l'environnement L'application est configurée pour communiquer avec une API à l'adresse https://localhost/api. Si votre API est hébergée à une autre adresse, modifiez le fichier api.js :

export const BASE_URL = 'https://votre-domaine.com/api';

Lancer l'application en mode développement npm run dev L'application sera accessible à l'adresse http://localhost:5173

Compiler pour la production npm run build

Les fichiers compilés seront disponibles dans le répertoire dist/.

Création d'un compte administrateur Il existe deux façons de créer un compte administrateur :

Option 1 : Via l'interface d'inscription (Recommandé pour le premier admin) Accédez à la page d'inscription de l'application (/register)

Créez un compte avec les informations suivantes :

Email : admin@example.com Mot de passe : choisissez un mot de passe sécurisé Prénom : Admin Nom : System

Une fois inscrit, connectez-vous à la base de données et exécutez la requête SQL suivante pour modifier les droits de l'utilisateur : UPDATE user SET roles = '["ROLE_ADMIN"]' WHERE email = 'admin@example.com';

Option 2 : Via le panneau d'administration (Requiert un premier admin) Si vous avez déjà un compte administrateur :

Connectez-vous avec votre compte admin Accédez au panneau d'administration (/admin) Dans la section "Créer un nouvel utilisateur administrateur", remplissez les champs : Prénom : Etienne Nom : Sautivet Email : etienne.sautivet@example.com Mot de passe : choisissez un mot de passe sécurisé Cliquez sur "Créer administrateur"

Structure des routes / ou /contents - Liste des contenus publiés /contents/add - Formulaire d'ajout de contenu (requiert authentification) /contents/:id - Détail d'un contenu spécifique /profil - Profil de l'utilisateur connecté (requiert authentification) /admin - Panneau d'administration (requiert rôle administrateur) /login - Page de connexion /register - Page d'inscription

Tests L'application inclut des tests end-to-end avec Cypress:

Lancer les tests e2e en développement
npm run test:e2e:dev

Lancer les tests e2e en production
npm run test:e2e

Technologies utilisées Vue.js 3 Vue Router Pinia (gestion d'état) Vite (bundler) Cypress (tests e2e) API Platform (backend Symfony) Auteur Etienne Sautivet - Projet Web 2025
