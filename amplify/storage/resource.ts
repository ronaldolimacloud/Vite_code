import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'newsPortalStorage',
  access: (allow) => ({
    // Public images - anyone can read, only authenticated users can upload
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
    // News article images - explicitly grant all required permissions for authenticated users
    'articles/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
    // User-specific images - only the owner can access them
    'private/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete'])
    ]
  })
});
