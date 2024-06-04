require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('./routes');
const bcrypt = require('bcryptjs');

const users = [
	{
		userId: 1,
		login: 'john',
		name: 'John',
		password: bcrypt.hashSync('abc123', 10),
	},
	{
		userId: 2,
		login: 'jane',
		name: 'Jane',
		password: bcrypt.hashSync('abc123', 10),
	},
	{
		userId: 3,
		login: 'jack',
		name: 'Jack',
		password: bcrypt.hashSync('abc123', 10),
	},
];

const login = process.argv[2];

const user = users.find((user) => user.login === login);

if (user) {
	console.log(`User selected: ${user.name}`);
} else {
	console.log('User not found');
}

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.send(`Hello User! The application is working! `);
});

app.use('/', routes);

app.use((req, res) => {
	res.status(404).sendFile(path.join(__dirname, 'public', '404.jpg'));
});

const server = () => {
	app.listen(
		process.env.PORT,
		console.log('Server started on port ' + process.env.PORT)
	);
};

module.exports = server;
