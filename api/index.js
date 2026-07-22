const { apiHandler } = require('../server');

module.exports = async function handler(request, response) {
  const url = new URL(request.url, `https://${request.headers.host || 'localhost'}`);
  return apiHandler(request, response, url);
};

