'use strict';

var defaults = {
	baseUrl: 'https://dns.api.gandi.net/api/v5/'
};

module.exports.create = function(config) {
	var baseUrl = (config.baseUrl || defaults.baseUrl).replace(/\/$/, '');
	var authtoken = config.token;
	var request;

	return {
		init: function(opts) {
			request = opts.request;
			return null;
		},

		zones: function(opts) {
			//console.log(opts);
			return request({
				method: 'GET',
				url: baseUrl + '/zones',
				headers: {
					'X-Api-Key': authtoken
				},
				json: true
			}).then(function(resp) {
				return resp.body.map(function(zone) {
					return zone.name;
				});
			});
		},

		set: function(opts) {
			//console.log(opts);
			return request({
				method: 'GET',
				url:
					baseUrl +
					'/domains/' +
					opts.challenge.dnsZone +
					'/records/' +
					opts.challenge.dnsPrefix +
					'/TXT',
				headers: {
					'X-Api-Key': authtoken
				},
				json: true
			}).then(function(resp) {
				function create() {
					return request({
						method: 'POST',
						url:
							baseUrl +
							'/domains/' +
							opts.challenge.dnsZone +
							'/records',
						headers: {
							'X-Api-Key': authtoken
						},
						json: {
							rrset_name: opts.challenge.dnsPrefix,
							rrset_type: 'TXT',
							rrset_ttl: 300,
							rrset_values: [opts.challenge.dnsAuthorization]
						}
					});
				}

				function replace() {
					var body = resp.body;
					var value = body.rrset_values.map(function(x) {
						return JSON.parse(x);
					});

					if (!body.rrset_values) {
						return null;
					}

					return request({
						method: 'PUT',
						url:
							baseUrl +
							'/domains/' +
							opts.challenge.dnsZone +
							'/records/' +
							opts.challenge.dnsPrefix +
							'/TXT',
						headers: {
							'X-Api-Key': authtoken
						},
						json: {
							rrset_ttl: 300,
							rrset_values: value.concat([
								opts.challenge.dnsAuthorization
							])
						}
					});
				}

				if (resp.body.cause === 'Not Found') {
					return create();
				} else {
					return replace();
				}
			});
		},

		remove: function(opts) {
			//console.log(opts);
			return request({
				method: 'DELETE',
				url:
					baseUrl +
					'/domains/' +
					opts.challenge.dnsZone +
					'/records/' +
					opts.challenge.dnsPrefix +
					'/TXT',
				headers: {
					'X-Api-Key': authtoken
				},
				json: true
			});
		},

		get: function(opts) {
			//console.log(opts);
			return request({
				method: 'GET',
				url:
					baseUrl +
					'/domains/' +
					opts.challenge.dnsZone +
					'/records/' +
					opts.challenge.dnsPrefix,
				headers: {
					'X-Api-Key': authtoken
				},
				json: true
			}).then(function(resp) {
				var body = resp.body;
				if (!(body.length > 0)) {
					return null;
				}

				var value = body[0].rrset_values
					.map(function(x) {
						return JSON.parse(x);
					})
					.filter(function(field) {
						return field === opts.challenge.dnsAuthorization;
					})[0];
				if (!value) {
					return null;
				}
				return {
					dnsAuthorization: value
				};
			});
		}
	};
};
