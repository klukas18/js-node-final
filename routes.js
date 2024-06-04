const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getAdsCollection } = require('./db');
const debug = require('debug')('app:debug');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// DEBUG MODE

const isDebugMode = process.argv.includes('debug');
if (isDebugMode) {
	const accessLogStream = fs.createWriteStream(
		path.join(__dirname, 'access.log'),
		{ flags: 'a' }
	);
	router.use(morgan(':date[iso] :method :url', { stream: accessLogStream }));
	debug('Logging is enabled');
}

// middleware function to check for user login
async function checkUserOwnership(req, res, next) {
	try {
	} catch (err) {}
}

// middleware function to check for password
function checkPassword(req, res, next) {
	const password = req.body.password;
	if (password === 'password') {
		next();
	} else {
		res.status(403).send('Forbidden: Incorrect password');
	}
}

// 1. Search for ads

router.get('/ads/search', async (req, res) => {
	try {
		const adsCollection = await getAdsCollection();

		// Build the query object based on the provided search criteria
		const query = {};
		if (req.query.title) {
			query.title = req.query.title;
		}
		if (req.query.author) {
			query.author = req.query.author;
		}
		if (req.query.category) {
			query.category = req.query.category;
		}
		if (req.query.price) {
			query.price = Number(req.query.price);
		}
		if (req.query.isAScam) {
			query.isAScam = req.query.isAScam === 'true';
		}

		// Find the ads that match the query
		const ads = await adsCollection.find(query).toArray();

		if (ads.length === 0) {
			console.log('No ads found based on the search criteria.');
			return res.status(404).send('No ads found.');
		} else {
			res.status(302).send(ads);
			console.log(JSON.stringify(ads, null, 2));
		}
	} catch (error) {
		console.error(error);
		res
			.status(404)
			.send(
				'An error occurred while searching for ads, could not retrieve the data.'
			);
	}
});

// 2. Return all ads from the backend
router.get('/ads', async (req, res) => {
	try {
		const adsCollection = await getAdsCollection();
		const ads = await adsCollection
			.find({}, { projection: { _id: 0, buffer: 0 } })
			.toArray();
		console.table(ads);
		res.status(302).send(ads);
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.send(`An error occurred while retrieving ads from the database.`);
	}
});

// 3. Return a single ad
router.get('/ads/:id', async (req, res) => {
	try {
		const adsCollection = await getAdsCollection();
		const ad = await adsCollection.findOne(
			{ _id: new ObjectId(req.params.id) },
			{ projection: { _id: 0, buffer: 0 } }
		);
		console.log(ad);

		// Content negotiation
		res.format({
			'text/plain': function () {
				res.status(302).send(JSON.stringify(ad));
			},

			'text/html': function () {
				res.status(302).send(`<div>${JSON.stringify(ad, null, 2)}</div>`);
			},

			'application/json': function () {
				res.status(302).json(ad);
			},

			default: function () {
				res
					.status(406)
					.send(
						'Not Acceptable format! Choose one of the available formats: text/plain, text/html, application/json'
					);
			},
		});
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.send(`An error occurred while retrieving the ad from the database.`);
	}
});

// 4. Save a new ad in database
router.post('/ads/add', express.json(), async (req, res) => {
	try {
		const adsCollection = await getAdsCollection();

		let date = new Date();
		date.setUTCHours(date.getUTCHours() + 2);
		req.body.date = date;

		const result = await adsCollection.insertOne(req.body);
		const newAd = await adsCollection.findOne(
			{ _id: result.insertedId },
			{ projection: { _id: 0, buffer: 0 } }
		);

		console.log('New ad successfully added to the database!');
		console.log(newAd);
		res.status(201).send(newAd);
	} catch (error) {
		console.error(error);
		res.status(500).send(`An error occurred while saving the ad.`);
	}
});

// 5. Modify selected ad
router.put(
	'/ads/:id',
	checkUserOwnership,
	checkPassword,
	express.json(),
	async (req, res) => {
		try {
			const adsCollection = await getAdsCollection();

			// Add a modifiedDate field to the ad
			let date = new Date();
			date.setUTCHours(date.getUTCHours() + 2);
			req.body.modifiedDate = date;

			const result = await adsCollection.updateOne(
				{ _id: new ObjectId(req.params.id) },
				{ $set: req.body }
			);
			if (result.modifiedCount === 1) {
				const modifiedAd = await adsCollection.findOne({
					_id: new ObjectId(req.params.id),
				});
				console.log('Ad successfully updated!');
				console.log(modifiedAd);
				res.status(205).send(modifiedAd);
			} else {
				res.status(404).send(`Ad not found`);
			}
		} catch (error) {
			console.error(error);
			res.status(500).send(`An error occurred while updating the ad.`);
		}
	}
);

// 6. Remove selected ad
router.delete(
	'/ads/:id',
	checkUserOwnership,
	checkPassword,
	async (req, res) => {
		try {
			const adsCollection = await getAdsCollection();
			const result = await adsCollection.deleteOne({
				_id: new ObjectId(req.params.id),
			});
			if (result.deletedCount === 1) {
				console.log(`Ad deleted successfully!`);
				res.status(410).send(`Ad deleted successfully!`);
			} else {
				res.status(404).send(`Could not delete - Ad not found!`);
			}
		} catch (error) {
			console.error(error);
			res.status(500).send(`An error occurred while deleting the ad.`);
		}
	}
);

// 7. Heartbeat
router.get('/heartbeat', (req, res) => {
	const date = new Date();
	const utcDate = new Date(date.toUTCString());
	res.send(`Current time and date: ${utcDate}`);
	console.log(`Current time and date: ${utcDate}`);
});

module.exports = router;
