/**
 * Quick script to create test contacts via the API
 *
 * Usage: Run this in the browser console while logged into the app
 */

async function createTestContacts() {
  const testContacts = [
    { firstName: "John", lastName: "Doe", email: "john.doe@example.com", phone: "555-0100" },
    { firstName: "Jane", lastName: "Smith", email: "jane.smith@example.com", phone: "555-0101" },
    { firstName: "Robert", lastName: "Johnson", email: "robert.johnson@example.com", phone: "555-0102" },
    { firstName: "Maria", lastName: "Garcia", email: "maria.garcia@example.com", phone: "555-0103" },
  ];

  for (const contact of testContacts) {
    const response = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Created: ${contact.firstName} ${contact.lastName}`, data.contact.id);
    } else {
      console.error(`❌ Failed: ${contact.firstName} ${contact.lastName}`, await response.text());
    }
  }

  console.log('✅ Done! Refresh the page to see contacts in the workflow trigger dialog.');
}

createTestContacts();
