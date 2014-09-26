'use strict';

function HttpResult(code, headers, body) {
  this.code = code;
  this.headers = headers;
  this.body = body;
}

HttpResult.OK = 200;
HttpResult.MULTI = 207;
HttpResult.BAD_REQUEST = 400;
HttpResult.UNAUTHORIZED = 401;
HttpResult.NOT_FOUND = 404;
HttpResult.UNPROCESSABLE = 422;
HttpResult.INTERNAL = 500;

module.exports = HttpResult;
