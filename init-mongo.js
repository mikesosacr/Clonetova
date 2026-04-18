db = db.getSiblingDB('centovacast');
db.createUser({
  user: 'centovacast',
  pwd: 'centovacast123',
  roles: [{ role: 'readWrite', db: 'centovacast' }]
});
db.createCollection('users');
db.createCollection('streams');
db.createCollection('media');
print('MongoDB inicializado correctamente');
