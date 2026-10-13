describe('Franchise Exchange E2E Test Suite', () => {
  const baseUrl = 'https://franchise-exchange-442efea6abbb.herokuapp.com';
  const timestamp = Date.now();
  const testEmail = `user_${timestamp}@example.com`;
  const franchiserPassword = 'Password123!';
  const customerPassword = 'Password456!';
  const adminEmail = `admin_${timestamp}@example.com`;
  const adminPassword = 'AdminPassword123!';
  const packageName = `Zen Bistro ${timestamp}`;
  const packageDesc = 'A premier automated Japanese fusion franchise brand with complete turnkey SOPs and high unit economics.';
  const packagePrice = 30000;
  const baseCapital = 175000;
  const projectedRevenue = 750000;
  const equipmentName = 'Commercial Ramen Station';
  const equipmentPrice = '8500';

  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('1. Verifies Marketing, Information Pages & Navigation Aliases', () => {
    // Visit Home
    cy.visit(baseUrl);
    cy.contains('Scale Your Brand. Launch Your Dream.').should('be.visible');
    cy.contains('Get Started').should('be.visible');
    cy.contains('View Pricing').should('be.visible');
    cy.contains('For Franchisers').should('be.visible');
    cy.contains('For Franchisees').should('be.visible');

    // Test Get Started button goes to /login
    cy.contains('Get Started').click();
    cy.url().should('include', '/login');

    // Test /register alias also renders Login & Register interface
    cy.visit(`${baseUrl}/register`);
    cy.contains('I am a Customer').should('be.visible');
    cy.contains('I am a Franchiser').should('be.visible');

    // Visit How it Works - Franchiser
    cy.visit(`${baseUrl}/how-it-works/franchiser`);
    cy.contains('How It Works for Franchisers').should('be.visible');

    // Visit How it Works - Franchisee
    cy.visit(`${baseUrl}/how-it-works/franchisee`);
    cy.contains('How It Works for Franchisees').should('be.visible');

    // Visit Pricing
    cy.visit(`${baseUrl}/pricing`);
    cy.contains('Transparent Pricing').should('be.visible');
    cy.contains('5%').should('be.visible');

    // Visit Privacy Policy
    cy.visit(`${baseUrl}/privacy`);
    cy.contains('Privacy Policy').should('be.visible');
  });

  it('2. Dual-Role Registration & Login (Same Email as Franchiser and Customer)', () => {
    // Register as Franchiser
    cy.visit(`${baseUrl}/login`);
    cy.contains('Need an account? Register').click();
    cy.contains('I am a Franchiser').click();
    cy.get('input[type="email"]').clear().type(testEmail);
    cy.get('input[type="password"]').clear().type(franchiserPassword);
    cy.get('button[type="submit"]').contains('Register as Franchiser').click();

    // Should redirect to Franchiser Dashboard
    cy.url().should('include', '/franchiser');
    cy.contains('Franchiser Dashboard').should('be.visible');

    // Logout
    cy.contains('Logout').click();
    cy.url().should('include', '/login');

    // Register with SAME EMAIL as Customer (Franchisee)
    cy.contains('Need an account? Register').click();
    cy.contains('I am a Customer').click();
    cy.get('input[type="email"]').clear().type(testEmail);
    cy.get('input[type="password"]').clear().type(customerPassword);
    cy.get('button[type="submit"]').contains('Register as Customer').click();

    // Should redirect to Franchisee Dashboard
    cy.url().should('include', '/franchisee');
    cy.contains('Customer & Franchisee Dashboard').should('be.visible');

    // Logout
    cy.contains('Logout').click();

    // Login as Franchiser using the shared email
    cy.contains('I am a Franchiser').click();
    cy.get('input[type="email"]').clear().type(testEmail);
    cy.get('input[type="password"]').clear().type(franchiserPassword);
    cy.get('button[type="submit"]').contains('Login as Franchiser').click();
    cy.url().should('include', '/franchiser');

    // Logout again
    cy.contains('Logout').click();
  });

  it('3. Franchiser Creates Package, Adds Equipment Items, Uploads Assets & Submits Support Ticket', () => {
    // Login as Franchiser
    cy.visit(`${baseUrl}/login`);
    cy.contains('I am a Franchiser').click();
    cy.get('input[type="email"]').clear().type(testEmail);
    cy.get('input[type="password"]').clear().type(franchiserPassword);
    cy.get('button[type="submit"]').contains('Login as Franchiser').click();

    cy.contains('Create New Comprehensive Franchise Package').should('be.visible');
    cy.contains('Active Franchise Deployments & Sales Analytics').should('be.visible');

    // Fill package form
    cy.get('input[placeholder*="Apex Nitro Coffee"]').type(packageName);
    cy.get('textarea[placeholder*="operating model"]').type(packageDesc);
    cy.get('input[placeholder="e.g. 25000"]').clear().type(packagePrice.toString());
    cy.get('input[placeholder="e.g. 150000"]').clear().type(baseCapital.toString());
    cy.get('input[placeholder="e.g. 650000"]').clear().type(projectedRevenue.toString());

    // Submit package creation
    cy.contains('button', 'Create Franchise Package').click();

    // Verify package appears under "Your Franchise Packages" with status PENDING
    cy.contains('Your Franchise Packages').should('be.visible');
    cy.contains(packageName).should('be.visible');
    cy.contains('PENDING').should('be.visible');
    cy.contains(`$${packagePrice.toLocaleString()}`).should('be.visible');

    // Upload Brand Asset specifically to this package
    cy.contains('.MuiCard-root', packageName).within(() => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-brand-asset.txt', { force: true });
      cy.contains('button', 'Upload').click();
      cy.contains('test-brand-asset.txt', { timeout: 10000 }).should('be.visible');
      cy.contains('View').should('be.visible');

      // Add Startup Equipment / Inventory line item
      cy.get('input[placeholder*="Item name"]').type(equipmentName);
      cy.get('input[placeholder*="Est Price"]').type(equipmentPrice);
      cy.contains('button', 'Add Item').click();
      cy.contains(equipmentName, { timeout: 10000 }).should('be.visible');
    });

    // Test Support Help Desk modal
    cy.contains('button', 'Support').click();
    cy.contains('Platform Support & Help Desk').should('be.visible');
    cy.get('input[placeholder*="Question about"]').type(`Support Ticket ${timestamp}`);
    cy.get('textarea[placeholder*="Describe your issue"]').type('Need assistance reviewing trademark schedule documentation.');
    cy.contains('button', 'Submit Support Ticket').click();
    cy.contains(`Support Ticket ${timestamp}`).should('be.visible');
    cy.contains('button', 'Close').click();

    cy.contains('Logout').click();
  });

  it('4. Admin Portal Login, Package Approval, User Registry & Support Resolution', () => {
    // Register admin user if not already present
    cy.request({
      method: 'POST',
      url: `${baseUrl}/api/auth/register`,
      body: {
        email: adminEmail,
        password: adminPassword,
        role: 'ADMIN',
        firstName: 'System',
        lastName: 'Admin'
      },
      failOnStatusCode: false
    });

    // Go to restricted Admin Login page
    cy.visit(`${baseUrl}/admin-login`);
    cy.contains('Admin Portal Login').should('be.visible');

    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();

    // Verify Admin Dashboard & Operational Tabs
    cy.url().should('include', '/admin');
    cy.contains('Admin Portal & Platform Operations').should('be.visible');
    cy.contains('Total Registered Users').should('be.visible');
    cy.contains('Platform Fees Earned (5%)').should('be.visible');

    // Find our package and approve it
    cy.contains('tr', packageName).within(() => {
      cy.contains('PENDING').should('be.visible');
      cy.contains('button', 'Approve').click();
    });

    // Verify status updates to APPROVED
    cy.contains('tr', packageName).within(() => {
      cy.contains('APPROVED').should('be.visible');
    });

    // Test User Registry tab
    cy.contains('.MuiTab-root', 'User Registry').click();
    cy.contains(testEmail, { timeout: 15000 }).should('be.visible');

    // Test Support Tickets tab and resolve the ticket
    cy.contains('.MuiTab-root', 'Support Tickets').click();
    cy.contains(`Support Ticket ${timestamp}`).should('be.visible');
    cy.contains('tr', `Support Ticket ${timestamp}`).within(() => {
      cy.get('.MuiSelect-select').click();
    });
    cy.get('li[data-value="RESOLVED"]').click();

    cy.contains('Logout').click();
  });

  it('5. Customer Searches, Reviews Unit Economics & Acquires Franchise with Brand Assets and Equipment', () => {
    // Login as Customer
    cy.visit(`${baseUrl}/login`);
    cy.contains('I am a Customer').click();
    cy.get('input[type="email"]').clear().type(testEmail);
    cy.get('input[type="password"]').clear().type(customerPassword);
    cy.get('button[type="submit"]').contains('Login as Customer').click();

    cy.url().should('include', '/franchisee');
    cy.contains('Available Franchises').should('be.visible');

    // Test Search input
    cy.get('input[placeholder*="Search Franchises"]').type(packageName);
    cy.contains('button', 'Search').click();

    // Verify package is displayed with full metadata & economics and select it
    cy.contains('.MuiCard-root', packageName).within(() => {
      cy.contains(packageName).should('be.visible');
      cy.contains(packageDesc).should('be.visible');
      cy.contains(`$${packagePrice.toLocaleString()}`).should('be.visible');
      cy.contains(`$${baseCapital.toLocaleString()}`).should('be.visible');
      cy.contains(`$${projectedRevenue.toLocaleString()}/yr`).should('be.visible');
      cy.contains('Brand Assets Conveyed on Purchase').should('be.visible');
      cy.contains('button', 'Select Package').click();
    });

    // Real Estate search section should appear (backed by live PostgreSQL database)
    cy.contains('Step 2: Match Commercial Real Estate').should('be.visible');
    cy.get('input[placeholder*="Seattle"]').clear().type('Seattle');
    cy.contains('button', 'Search Properties').click();

    // Real estate listings should appear
    cy.contains('Deploy Here').should('be.visible');
    cy.contains('Deploy Here').first().click();

    // Modal verification
    cy.contains('Confirm Franchise Deployment & Acquisition').should('be.visible');
    cy.contains('Investment & Conveyance Summary').should('be.visible');
    cy.contains(`$${packagePrice.toLocaleString()}`).should('be.visible');
    cy.contains(`$${baseCapital.toLocaleString()}`).should('be.visible');
    cy.contains('Brand Assets Conveyed to Buyer Upon Purchase:').should('be.visible');
    cy.contains('test-brand-asset.txt').should('be.visible');
    cy.contains('Startup Equipment & Inventory Kit Included:').should('be.visible');
    cy.contains(equipmentName).should('be.visible');

    // Pay & Convey Assets button
    cy.contains('button', `Pay $${packagePrice.toLocaleString()} & Convey Assets`).click();

    // Verify the Conveyed Brand Assets section appears on Franchisee Dashboard
    cy.contains('Your Purchased Franchises & Conveyed Brand Assets', { timeout: 15000 }).should('be.visible');
    cy.contains(packageName).should('be.visible');
    cy.contains('test-brand-asset.txt').should('be.visible');
    cy.contains('Download').should('be.visible');
    cy.contains('Download Plan & Financials (.docx / .xlsx)').should('be.visible');

    cy.contains('Logout').click();
  });

  it('6. Franchiser Tracks Active Deployments & Verified Sales Earnings', () => {
    // Login as Franchiser
    cy.visit(`${baseUrl}/login`);
    cy.contains('I am a Franchiser').click();
    cy.get('input[type="email"]').clear().type(testEmail);
    cy.get('input[type="password"]').clear().type(franchiserPassword);
    cy.get('button[type="submit"]').contains('Login as Franchiser').click();

    cy.url().should('include', '/franchiser');

    // Verify sales analytics reflects the purchased unit
    cy.contains('Active Franchise Deployments & Sales Analytics').should('be.visible');
    cy.contains('Units Deployed').should('be.visible');
    cy.contains(packageName).should('be.visible');
    cy.contains(testEmail).should('be.visible');
    cy.contains('Seattle').should('be.visible');
    cy.contains(`$${packagePrice.toLocaleString()}`).should('be.visible');
    cy.contains('ACTIVE').should('be.visible');
  });
});
