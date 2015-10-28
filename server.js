function start(startCallback, logger, mongo) {
	var port = process.env.PORT || 1337;

	var express = require('express');
	var hbs = require('hbs');

	var app = express();
	app.set('view engine', 'html');
	app.engine('html', hbs.__express);
	app.use(express.static('static'));

	app.use(function(req, res, next) {
		logger.info("Request for " + req.path);
		next();
	});

	app.get('/', function(req, res, next) {
		mongo.collection('posts').find().toArray(function(err, items) {
			if (err) {
				var error = new Error("Could not retrieve posts");
				error.statusCode = 500;
				return next(error);
			}
			res.render('index.html', { posts: items.map(function(i) { return i.title; }) });
		});
	});
	app.get('/posts/:title', function(req, res, next) {
		mongo.collection('posts').findOne({ title: req.params.title }, function(err, item) {
			if (err) {
				var error = new Error("Post not found");
				error.statusCode = 404;
				return next(error);
			}
			res.render('post.html', { title: item.title, content: item.content });
		});
	});

	app.use(function(req, res, next) {
		var error = new Error("Page not found");
		error.statusCode = 404;
		next(error);
	});
	app.use(function(err, req, res, next) {
		logger.error("Error: " + err.message, { path: req.path, stackTrace: err.stack });
		res.status(err.statusCode);
		res.render('error.html', { title: err.message, errorCode: err.statusCode });
	});

	var server = app.listen(port, function(err) {
		if (err) {
			logger.info('Server initialization failed');
			startCallback(err);
		}
		else {
			logger.info('Server listening');
			startCallback(null, server);
		}
	});
}

function stop(server, logger) {
	if (server) {
		server.close();
		server = null;
		logger.info('Server stopped');
	}
}

module.exports = function(logger, db) {
	if(!logger || !db) {
		throw "Missing dependency";
	}
	var server;

	return {
		start: function(startCallback) {
			start(function(err, srv) {
				if (err) {
					return startCallback(err);
				}
				server = srv;
				startCallback(null, server.address());
			}, logger, db);
		},
		stop: function() { stop(server, logger); }
	};
};
