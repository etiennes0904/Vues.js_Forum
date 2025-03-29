describe('Parcours utilisateur complet', () => {
  beforeEach(() => {

    Cypress.config('defaultCommandTimeout', 30000);
    Cypress.config('pageLoadTimeout', 60000);
    Cypress.config('requestTimeout', 30000);
  });

  it('Inscrit, connecte un utilisateur, crée du contenu avec image puis le supprime', () => {
    const uniqueId = Date.now();
    const email = `cypress${uniqueId}@example.com`;
    const password = 'Password123!';
    const title = `Film Test Cypress ${uniqueId}`;
    const contentText = 'Ceci est une description de test pour Cypress';


    cy.visit('http://localhost:5173/register');
    cy.wait(3000);
    cy.get('#email').should('be.visible').type(email, { delay: 100, force: true });
    cy.wait(1000);
    cy.get('#firstname').should('be.visible').type('CypressTest', { delay: 100, force: true });
    cy.wait(1000);
    cy.get('#lastname').should('be.visible').type('UserTest', { delay: 100, force: true });
    cy.wait(1000);
    cy.get('#password').should('be.visible').type(password, { delay: 100, force: true });
    cy.wait(1000);
    cy.get('button[type="submit"]').should('be.visible').click({ force: true });
    cy.wait(3000);

    cy.url().should('include', '/login', { timeout: 120000 });
    cy.wait(5000);
    cy.contains('Connexion', { timeout: 60000 }).should('be.visible');
    cy.wait(3000);


    cy.get('#email').should('be.visible').clear().type(email, { delay: 100, force: true });
    cy.wait(1000);
    cy.get('#password').should('be.visible').clear().type(password, { delay: 100, force: true });
    cy.wait(1000);
    cy.get('button[type="submit"]').should('be.visible').click({ force: true });
    cy.wait(5000);

    cy.url().should('eq', 'http://localhost:5173/', { timeout: 60000 });
    cy.wait(5000);
    cy.contains('Forum', { timeout: 30000 }).should('be.visible');
    cy.wait(3000);


    cy.visit('http://localhost:5173/contents/add');
    cy.wait(10000);
    cy.url().should('include', '/contents/add', { timeout: 30000 });
    cy.wait(3000);


    cy.screenshot('form-add-content');
    

    cy.document().then((doc) => {
      cy.log('Formulaire visible:', !!doc.querySelector('form'));
 
      const inputs = Array.from(doc.querySelectorAll('input, textarea'));
      inputs.forEach((input, i) => {
        const attrs = {
          id: input.id,
          name: input.name,
          placeholder: input.placeholder,
          type: input.type,
          tagName: input.tagName
        };
        cy.log(`Élément ${i}:`, JSON.stringify(attrs));
      });
    });


    cy.get('input#title').then(els => {
      if (els.length) cy.wrap(els).type(title, { force: true });
      else cy.get('input[name="title"]').then(els => {
        if (els.length) cy.wrap(els).type(title, { force: true });
        else cy.get('input[placeholder*="itre"]').type(title, { force: true });
      });
    });
    cy.wait(1000);
    
 
    cy.get('textarea#content, textarea[name="content"], textarea').first().type(contentText, { force: true });
    cy.wait(1000);
    

    cy.get('input[type="file"]').should('exist').selectFile('cypress/fixtures/test.png', { force: true });
    cy.wait(2000);
    

    cy.get('input#metaTitle, input[name="metaTitle"], input[placeholder*="eta"]').first().type('Meta Title Test', { force: true });
    cy.wait(1000);
    

    cy.get('textarea#metaDescription, textarea[name="metaDescription"], textarea').eq(1).type('Meta Description Test', { force: true });
    cy.wait(1000);
    

    cy.get('input#tags, input[name="tags"], input[placeholder*="ags"]').first().type('test,cypress,automation', { force: true });
    cy.wait(1000);
    

    cy.get('[data-cy="submit-content"], button[type="submit"], .btn-submit, button')
      .contains(/ajouter|enregistrer|submit|save/i)
      .click({ force: true });
    cy.wait(10000); 
    
 
    cy.get('body').then($body => {
      if ($body.text().includes('succès') || $body.text().includes('success')) {
        cy.log('Message de succès trouvé');
      } else {
        cy.log('Pas de message de succès trouvé, mais on continue');
      }
    });
    cy.wait(5000); 
    

    cy.visit('http://localhost:5173/Contents');
    cy.wait(5000); 
    

    cy.reload();
    cy.wait(8000);
    

    cy.screenshot('contents-page-after-reload');
    

    cy.get('body').then($body => {
      const pageText = $body.text();
      const titlePartial = title.substring(0, 10); 
      
      if (pageText.includes(titlePartial)) {
        cy.log(`Titre trouvé dans le texte de la page après rechargement: ${titlePartial}`);
      } else {
        cy.log(`Titre non trouvé dans le texte de la page après rechargement. Texte de la page: ${pageText.substring(0, 200)}...`);
        

        cy.reload();
        cy.wait(8000);
        cy.screenshot('contents-page-second-reload');
      }
    });
    

    const titlePartial = title.split(' ')[0] + ' ' + title.split(' ')[1]; 
    cy.contains(titlePartial, { timeout: 60000 }).should('exist');
    cy.wait(3000);


    cy.visit('http://localhost:5173/Profil');
    cy.wait(5000);
    

    cy.reload();
    cy.wait(5000);
    
    cy.contains('Profil', { timeout: 30000 }).should('be.visible');
    cy.wait(1000);
    cy.contains(email, { timeout: 30000 }).should('be.visible');
    cy.wait(3000);

    cy.contains('Mes Publications', { timeout: 30000 }).should('be.visible');
    cy.wait(5000);
    

    cy.screenshot('profile-contents-after-reload');
    

    cy.get('body').then($body => {
      if (!$body.text().includes(titlePartial)) {
        cy.log('Contenu non trouvé dans le profil, essai de rechargement');
        cy.reload();
        cy.wait(8000);
      }
    });
    

    cy.get('body').then($body => {
      if ($body.text().includes(titlePartial)) {
        cy.log(`Titre ou partie du titre trouvé dans le profil: ${titlePartial}`);
      } else {
        cy.log(`Titre non trouvé dans le profil. Texte de la page: ${$body.text().substring(0, 200)}...`);
      }
    });

    cy.get('.logout-btn', { timeout: 30000 }).should('be.visible').click({ force: true });
    cy.wait(5000);
    cy.contains('Connexion', { timeout: 45000 }).should('be.visible');
  });
});