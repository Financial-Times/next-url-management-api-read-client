'use strict';

const active = require('./lib/active');
const get = require('./lib/get');
const batchGet = require('./lib/batch-get');
const dynamos = require('./lib/dynamos');
const health = require('./lib/health');

let metrics;
let timeout;

exports.health = health.check;

exports.get = fromURL => {
	try {
		fromURL = decodeURI(fromURL);
	} catch(err) {
		return Promise.reject(err);
	}

	// TODO: This should probably be more generic and actually parse the URL to extract the path to
	//check that it isn't just `/` rather than being specifically for FT.com
	if (fromURL !== 'https://www.ft.com/' && fromURL[fromURL.length - 1] === '/') {
		const trimmedURL = fromURL.replace(/\/+$/, '');
		return Promise.resolve({
			fromURL: encodeURI(fromURL),
			toURL: encodeURI(trimmedURL),
			code: 301
		});
	} else if (fromURL === 'https://www.ft.com/') {
		return Promise.resolve({
			fromURL: encodeURI(fromURL),
			toURL: encodeURI(fromURL),
			code: 100
		});
	}

	const dynamo = dynamos.get([active()]);
	return get({
		dynamo: dynamo.instance,
		table: dynamo.table,
		fromURL,
		metrics,
		timeout
	});
};

exports.batchGet = fromURLs => {

	return Promise.resolve()
		.then(() => {
			if (fromURLs.length === 0) {
				return [];
			}

			// Normall ‘get’ synthesises redirects from, say, https//www.ft.com/blah/ to https://www.ft.com/blah.
			// It's a bit fiddly to do this in batch mode and not yet needed so haven't opted to not support this
			// use case just yet.  TODO, later on, if needed…
			fromURLs.forEach(fromURL => {
				if (fromURL !== 'https://www.ft.com/' && fromURL[fromURL.length - 1] === '/') {
					throw new Error(`event=BAD_FROMURL fromURL=${fromURL} message="Trailing slash redirection to trimmed URLs not supported by ‘batchGet’`);
				}
			});

			const dynamo = dynamos.get([active()]);
			return batchGet({
				dynamo: dynamo.instance,
				table: dynamo.table,
				fromURLs,
				metrics,
				timeout
			});
		});

};

exports.init = opts => {
	metrics = opts.metrics;
	timeout = opts.timeout;
	active.init(opts);
};
