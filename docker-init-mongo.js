db.createUser({
	user: 'admin',
	pwd: '3xp8ej9*&HDE',
	roles: [
		// {role: 'readWrite', db: 'joombo'}
		'userAdminAnyDatabase',
		'readWriteAnyDatabase'
	]
});
